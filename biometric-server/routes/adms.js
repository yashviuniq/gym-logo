/**
 * ADMS Protocol Routes
 * Handles communication with eSSL F22 Biometric Device
 * 
 * MULTI-GYM SYSTEM:
 * - Device SN → gym_id mapping
 * - Member lookup with membership status
 * - All attendance is tagged with gym_id
 */

import { supabase } from '../utils/supabaseClient.js';

// ============================================
// MULTI-GYM SUPPORT: Device Cache
// Caches device SN → gym_id mapping to reduce DB lookups
// ============================================
const deviceCache = new Map();
const DEVICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * CRITICAL FUNCTION: Get gym_id from device serial number
 * This is the ONLY source of truth for gym_id mapping
 * gym_id is NEVER sent by the device or frontend
 * 
 * @param {string} deviceSN - Device serial number from ADMS protocol
 * @param {object} logger - Fastify logger instance
 * @returns {Promise<{gym_id: string|null, device_id: string|null, error: string|null}>}
 */
async function getGymFromDeviceSN(deviceSN, logger) {
  // Check cache first for performance
  const cached = deviceCache.get(deviceSN);
  if (cached && (Date.now() - cached.timestamp < DEVICE_CACHE_TTL)) {
    return { gym_id: cached.gym_id, device_id: cached.device_id, error: null };
  }
  
  try {
    // Query device from database (no is_active column in your schema)
    const { data, error } = await supabase
      .from('devices')
      .select('id, gym_id, device_sn')
      .eq('device_sn', deviceSN)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows - device not registered
        logger.warn({
          msg: '⚠️ UNKNOWN DEVICE - Not registered in system',
          deviceSN,
          action: 'Register this device in Supabase: INSERT INTO devices (gym_id, device_sn, location) VALUES (...)'
        });
        return { gym_id: null, device_id: null, error: 'DEVICE_NOT_REGISTERED' };
      }
      logger.error({ msg: 'Database error looking up device', error });
      return { gym_id: null, device_id: null, error: 'DATABASE_ERROR' };
    }
    
    // Update last_seen_at (async, don't wait)
    supabase
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {});
    
    // Cache the result
    deviceCache.set(deviceSN, {
      gym_id: data.gym_id,
      device_id: data.id,
      timestamp: Date.now()
    });
    
    return { gym_id: data.gym_id, device_id: data.id, error: null };
    
  } catch (err) {
    logger.error({ msg: 'Exception in getGymFromDeviceSN', error: err.message });
    return { gym_id: null, device_id: null, error: 'EXCEPTION' };
  }
}

/**
 * Get member info and check membership status
 * Uses your existing schema: members table + memberships table
 * 
 * @param {string} gymId - Gym UUID
 * @param {string} fingerprintId - PIN from biometric device
 * @param {object} logger - Fastify logger
 * @returns {Promise<{member_id: string|null, membership_status: string, member_name: string|null}>}
 */
async function getMemberInfo(gymId, fingerprintId, logger) {
  try {
    // Step 1: Find member by gym_id and fingerprint_id
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name')
      .eq('gym_id', gymId)
      .eq('fingerprint_id', fingerprintId)
      .single();
    
    if (memberError || !member) {
      logger.info({
        msg: 'Member not found by fingerprint_id',
        gymId,
        fingerprintId
      });
      return { member_id: null, membership_status: 'UNKNOWN_MEMBER', member_name: null };
    }
    
    // Step 2: Check membership status from memberships table
    const today = new Date().toISOString().split('T')[0];
    
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, status, end_date')
      .eq('member_id', member.id)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    let membership_status = 'NO_MEMBERSHIP';
    
    if (membership) {
      // Check if membership is expired by date
      if (membership.end_date < today) {
        membership_status = 'EXPIRED';
        logger.warn({
          msg: '⚠️ EXPIRED MEMBERSHIP CHECK-IN',
          member_name: member.full_name,
          member_id: member.id,
          membership_end: membership.end_date,
          fingerprintId
        });
      } else if (membership.status === 'active') {
        membership_status = 'ACTIVE';
      } else if (membership.status === 'expired') {
        membership_status = 'EXPIRED';
      } else if (membership.status === 'cancelled') {
        membership_status = 'CANCELLED';
      }
    }
    
    return { member_id: member.id, membership_status, member_name: member.full_name };
    
  } catch (err) {
    logger.error({ msg: 'Exception in getMemberInfo', error: err.message });
    return { member_id: null, membership_status: 'ERROR' };
  }
}

/**
 * Parse ADMS attendance data from various formats
 * eSSL devices can send data in multiple formats
 */
function parseAttendanceData(body, query) {
  const records = [];
  
  // Format 1: Body contains attendance lines (most common)
  // Example: "1\t2026-01-10 09:30:00\t0\t1\t\t\t"
  if (body && typeof body === 'string') {
    const lines = body.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        records.push({
          user_id: parts[0]?.trim() || 'UNKNOWN',
          timestamp: parts[1]?.trim() || new Date().toISOString(),
          status: parseStatus(parts[2]?.trim()),
          verify_type: parts[3]?.trim() || '0',
          work_code: parts[4]?.trim() || '',
        });
      }
    }
  }
  
  // Format 2: Query parameters contain single record
  // Example: ?SN=ABC123&PIN=1&Time=2026-01-10 09:30:00&Status=0
  if (query.PIN || query.pin) {
    records.push({
      user_id: query.PIN || query.pin || 'UNKNOWN',
      timestamp: query.Time || query.time || new Date().toISOString(),
      status: parseStatus(query.Status || query.status),
      verify_type: query.Verify || query.verify || '0',
      work_code: query.WorkCode || query.workcode || '',
    });
  }
  
  // Format 3: ATTLOG format in body
  // Example: ATTLOG PIN=1\tTime=2026-01-10 09:30:00\tStatus=0
  if (body && typeof body === 'string' && body.includes('ATTLOG')) {
    const attlogMatch = body.match(/PIN=(\d+)\s+Time=([^\s]+\s+[^\s]+)\s+Status=(\d+)/gi);
    if (attlogMatch) {
      for (const match of attlogMatch) {
        const pinMatch = match.match(/PIN=(\d+)/i);
        const timeMatch = match.match(/Time=([^\s]+\s+[^\s]+)/i);
        const statusMatch = match.match(/Status=(\d+)/i);
        
        if (pinMatch && timeMatch) {
          records.push({
            user_id: pinMatch[1],
            timestamp: timeMatch[1],
            status: parseStatus(statusMatch?.[1]),
            verify_type: '0',
            work_code: '',
          });
        }
      }
    }
  }
  
  return records;
}

/**
 * Parse attendance status code
 * 0 = Check-In, 1 = Check-Out, 2 = Break-Out, 3 = Break-In, etc.
 */
function parseStatus(statusCode) {
  const statusMap = {
    '0': 'CHECK_IN',
    '1': 'CHECK_OUT',
    '2': 'BREAK_OUT',
    '3': 'BREAK_IN',
    '4': 'OVERTIME_IN',
    '5': 'OVERTIME_OUT',
  };
  return statusMap[statusCode] || 'CHECK_IN';
}

/**
 * Get device serial number from request
 */
function getDeviceSN(query) {
  return query.SN || query.sn || query.SerialNumber || 'UNKNOWN';
}

export default async function admsRoutes(fastify, options) {
  
  /**
   * POST /iclock/cdata
   * Receive attendance punches from the biometric device
   * 
   * MULTI-GYM FLOW:
   * 1. Extract device SN from query params
   * 2. Lookup gym_id from devices table
   * 3. Lookup member info and membership status
   * 4. Save attendance with gym_id attached
   * 5. ALWAYS return 200 OK (never block device)
   */
  fastify.post('/cdata', async (request, reply) => {
    const startTime = Date.now();
    
    try {
      const { query, body } = request;
      const deviceSN = getDeviceSN(query);
      
      fastify.log.info({
        msg: '📥 Attendance data received',
        deviceSN,
        query,
        bodyType: typeof body,
        bodyLength: typeof body === 'string' ? body.length : 0
      });
      
      // ============================================
      // STEP 1: Get gym_id from device serial number
      // This is the ONLY way we determine gym_id
      // ============================================
      const { gym_id, device_id, error: deviceError } = await getGymFromDeviceSN(deviceSN, fastify.log);
      
      if (!gym_id) {
        fastify.log.warn({
          msg: '❌ Device not registered - attendance NOT saved',
          deviceSN,
          error: deviceError,
          action: 'Register this device in the devices table'
        });
        // IMPORTANT: Return OK so device doesn't block/retry
        // Attendance data is lost but device continues working
        return reply.code(200).send('OK');
      }
      
      // ============================================
      // STEP 2: Parse attendance records
      // ============================================
      const records = parseAttendanceData(body, query);
      
      if (records.length === 0) {
        fastify.log.warn('No attendance records parsed from request');
        return reply.code(200).send('OK');
      }
      
      // ============================================
      // STEP 3: Process each record with member lookup
      // ============================================
      const dbRecords = [];
      
      for (const record of records) {
        // Lookup member and check membership status
        const { member_id, membership_status, member_name } = await getMemberInfo(
          gym_id, 
          record.user_id, 
          fastify.log
        );
        
        dbRecords.push({
          gym_id: gym_id,                    // From device lookup
          user_id: record.user_id,           // Fingerprint PIN
          device_sn: deviceSN,
          member_id: member_id,              // Linked member UUID (nullable)
          timestamp: new Date(record.timestamp).toISOString(),
          status: record.status,
          membership_status: membership_status,  // ACTIVE, EXPIRED, etc.
          raw_data: {
            verify_type: record.verify_type,
            work_code: record.work_code,
            original_query: query,
            received_at: new Date().toISOString(),
            device_id: device_id,
            member_name: member_name || null
          }
        });
      }
      
      // ============================================
      // STEP 4: Insert into Supabase
      // ============================================
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(dbRecords)
        .select();
      
      if (error) {
        fastify.log.error({ msg: 'Supabase insert error', error });
        return reply.code(200).send('OK');
      }
      
      // Log success with membership warnings
      const expiredCount = dbRecords.filter(r => r.membership_status === 'EXPIRED').length;
      fastify.log.info({
        msg: '✅ Attendance saved',
        gym_id,
        deviceSN,
        count: dbRecords.length,
        expiredMemberships: expiredCount,
        duration: `${Date.now() - startTime}ms`
      });
      
      return reply.code(200).send('OK');
      
    } catch (error) {
      fastify.log.error({ msg: 'Error processing attendance', error: error.message });
      return reply.code(200).send('OK');
    }
  });
  
  /**
   * GET /iclock/cdata
   * Some devices use GET for handshake/initialization
   */
  fastify.get('/cdata', async (request, reply) => {
    const { query } = request;
    const deviceSN = getDeviceSN(query);
    
    fastify.log.info({
      msg: 'Device handshake/init',
      deviceSN,
      query
    });
    
    // Return device initialization parameters
    // These tell the device how to communicate
    const response = [
      `GET OPTION FROM: ${deviceSN}`,
      'Stamp=9999',
      'OpStamp=9999',
      'PhotoStamp=9999',
      'ErrorDelay=60',
      'Delay=30',
      'TransTimes=00:00;23:59',
      'TransInterval=1',
      'TransFlag=1111000000',
      'Realtime=1',
      'TimeZone=5.5', // IST timezone
      'ATTLOGStamp=0',
      'OPERLOGStamp=0',
      'ATTPHOTOStamp=0',
    ].join('\n');
    
    return reply.code(200).send(response);
  });
  
  /**
   * GET /iclock/getrequest
   * Device polls this URL to check for pending commands
   * MULTI-GYM: Filters commands by gym_id to prevent cross-gym leakage
   */
  fastify.get('/getrequest', async (request, reply) => {
    try {
      const { query } = request;
      const deviceSN = getDeviceSN(query);
      
      fastify.log.debug({
        msg: 'Device polling for commands',
        deviceSN
      });
      
      // Get gym_id for this device
      const { gym_id, error: deviceError } = await getGymFromDeviceSN(deviceSN, fastify.log);
      
      if (!gym_id) {
        return reply.code(200).send('OK');
      }
      
      // Query for pending commands for this device AND gym
      const { data: commands, error } = await supabase
        .from('device_commands')
        .select('id, command_string')
        .eq('gym_id', gym_id)
        .eq('device_sn', deviceSN)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (error) {
        fastify.log.error({ msg: 'Supabase query error', error });
        return reply.code(200).send('OK');
      }
      
      // No pending commands
      if (!commands || commands.length === 0) {
        return reply.code(200).send('OK');
      }
      
      const command = commands[0];
      
      // Update command status to SENT
      const { error: updateError } = await supabase
        .from('device_commands')
        .update({ 
          status: 'SENT',
          updated_at: new Date().toISOString()
        })
        .eq('id', command.id);
      
      if (updateError) {
        fastify.log.error({ msg: 'Failed to update command status', error: updateError });
      }
      
      // Return command in ADMS format: C:{ID}:{COMMAND_STRING}
      const response = `C:${command.id}:${command.command_string}`;
      
      fastify.log.info({
        msg: 'Command sent to device',
        commandId: command.id,
        command: command.command_string
      });
      
      return reply.code(200).send(response);
      
    } catch (error) {
      fastify.log.error({ msg: 'Error in getrequest', error: error.message });
      return reply.code(200).send('OK');
    }
  });
  
  /**
   * POST /iclock/devicecmd
   * Device confirms it finished executing a command
   */
  fastify.post('/devicecmd', async (request, reply) => {
    try {
      const { query, body } = request;
      const deviceSN = getDeviceSN(query);
      
      fastify.log.info({
        msg: 'Device command confirmation',
        deviceSN,
        query,
        body
      });
      
      // Parse command ID from response
      // Format can be: ID=xxx&Return=0 or C:xxx:RESULT
      let commandId = query.ID || query.id;
      
      if (body && typeof body === 'string') {
        const idMatch = body.match(/ID[=:](\S+)/i);
        if (idMatch) {
          commandId = idMatch[1];
        }
      }
      
      if (commandId) {
        // Update command status to SUCCESS
        const { error } = await supabase
          .from('device_commands')
          .update({ 
            status: 'SUCCESS',
            updated_at: new Date().toISOString()
          })
          .eq('id', commandId);
        
        if (error) {
          fastify.log.error({ msg: 'Failed to update command to SUCCESS', error });
        } else {
          fastify.log.info({ msg: 'Command marked as SUCCESS', commandId });
        }
      }
      
      return reply.code(200).send('OK');
      
    } catch (error) {
      fastify.log.error({ msg: 'Error in devicecmd', error: error.message });
      return reply.code(200).send('OK');
    }
  });
  
  /**
   * GET /iclock/ping
   * Device heartbeat/keep-alive
   */
  fastify.get('/ping', async (request, reply) => {
    const deviceSN = getDeviceSN(request.query);
    fastify.log.debug({ msg: 'Device ping', deviceSN });
    return reply.code(200).send('OK');
  });
  
  /**
   * Catch-all for other iclock endpoints
   * Some devices may hit different URLs
   */
  fastify.all('/*', async (request, reply) => {
    fastify.log.info({
      msg: 'Unhandled iclock request',
      method: request.method,
      url: request.url,
      query: request.query,
      body: request.body
    });
    return reply.code(200).send('OK');
  });
}
