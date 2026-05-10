"use client";

import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

const mockArticles = {
  1: {
    id: 1,
    title: "5 Best Warm-Up Exercises Before Workout",
    category: "tips",
    author: "FitZone Team",
    date: "January 15, 2025",
    readTime: "3 min",
    content: [
      {
        type: "paragraph",
        text: "Warming up before exercise is crucial for preparing your body for physical activity. A proper warm-up increases blood flow, raises body temperature, and reduces the risk of injury.",
      },
      {
        type: "heading",
        text: "1. Jumping Jacks",
      },
      {
        type: "paragraph",
        text: "Start with 30 seconds of jumping jacks to get your heart rate up and blood flowing to your muscles. This classic exercise engages your entire body.",
      },
      {
        type: "heading",
        text: "2. Arm Circles",
      },
      {
        type: "paragraph",
        text: "Extend your arms and make small circles, gradually increasing the size. Do 20 seconds forward, then 20 seconds backward. This warms up your shoulder joints.",
      },
      {
        type: "heading",
        text: "3. Leg Swings",
      },
      {
        type: "paragraph",
        text: "Hold onto a wall and swing one leg forward and backward. Do 15 swings per leg. This loosens up your hip flexors and hamstrings.",
      },
      {
        type: "heading",
        text: "4. High Knees",
      },
      {
        type: "paragraph",
        text: "March in place while bringing your knees up to hip level. Do this for 30 seconds to activate your core and leg muscles.",
      },
      {
        type: "heading",
        text: "5. Bodyweight Squats",
      },
      {
        type: "paragraph",
        text: "Perform 10-15 slow, controlled squats to warm up your quadriceps, hamstrings, and glutes. Keep your chest up and knees tracking over your toes.",
      },
      {
        type: "tip",
        text: "Spend at least 5-10 minutes warming up before any workout. Your muscles will thank you!",
      },
    ],
    relatedArticles: [5, 2],
  },
  2: {
    id: 2,
    title: "How to Prevent Lower Back Pain",
    category: "injury",
    author: "FitZone Team",
    date: "January 14, 2025",
    readTime: "5 min",
    content: [
      {
        type: "paragraph",
        text: "Lower back pain is one of the most common complaints among gym-goers. Most cases are preventable with proper form and awareness.",
      },
      {
        type: "heading",
        text: "Common Causes",
      },
      {
        type: "list",
        items: [
          "Poor posture during deadlifts and squats",
          "Weak core muscles",
          "Not warming up properly",
          "Lifting too heavy too soon",
          "Sitting for long periods between gym visits",
        ],
      },
      {
        type: "heading",
        text: "Prevention Tips",
      },
      {
        type: "paragraph",
        text: "1. Always maintain a neutral spine during exercises. Avoid rounding or over-arching your back.",
      },
      {
        type: "paragraph",
        text: "2. Strengthen your core with planks, dead bugs, and bird dogs. A strong core supports your lower back.",
      },
      {
        type: "paragraph",
        text: "3. Stretch your hip flexors regularly. Tight hips can pull on your lower back.",
      },
      {
        type: "warning",
        text: "If you experience sharp pain, stop immediately and consult a professional. Don't push through pain!",
      },
    ],
    relatedArticles: [6, 1],
  },
  3: {
    id: 3,
    title: "Post-Workout Nutrition Guide",
    category: "nutrition",
    author: "FitZone Team",
    date: "January 13, 2025",
    readTime: "4 min",
    content: [
      {
        type: "paragraph",
        text: "What you eat after your workout is just as important as the workout itself. Proper nutrition helps with recovery and muscle growth.",
      },
      {
        type: "heading",
        text: "The 30-Minute Window",
      },
      {
        type: "paragraph",
        text: "Try to eat within 30-60 minutes after your workout. This is when your muscles are most receptive to nutrients.",
      },
      {
        type: "heading",
        text: "What to Eat",
      },
      {
        type: "list",
        items: [
          "Protein: 20-40g (chicken, eggs, protein shake)",
          "Carbs: Replenish glycogen (rice, banana, oats)",
          "Hydration: At least 500ml water",
        ],
      },
      {
        type: "tip",
        text: "A simple post-workout meal: Grilled chicken with rice and vegetables, or a protein shake with a banana.",
      },
    ],
    relatedArticles: [7, 5],
  },
  4: {
    id: 4,
    title: "🎉 New Equipment Arrived!",
    category: "announcements",
    author: "Gym Management",
    date: "January 12, 2025",
    readTime: "1 min",
    content: [
      {
        type: "paragraph",
        text: "We're excited to announce that new equipment has arrived at FitZone Gym!",
      },
      {
        type: "heading",
        text: "New Additions",
      },
      {
        type: "list",
        items: [
          "2 New Cable Crossover Machines",
          "Dumbbell set (5kg - 50kg)",
          "Adjustable Benches (4 units)",
          "New Treadmills with touch screens",
          "Foam rollers and stretching mats",
        ],
      },
      {
        type: "paragraph",
        text: "Come check them out during your next visit! Our trainers will be happy to show you how to use the new equipment safely.",
      },
    ],
    relatedArticles: [],
  },
};

export default function ArticleDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const article = mockArticles[id] || mockArticles[1];

  const getCategoryIcon = (category) => {
    switch (category) {
      case "tips":
        return "💪";
      case "injury":
        return "🩹";
      case "nutrition":
        return "🥗";
      case "announcements":
        return "📢";
      default:
        return "📚";
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "tips":
        return "bg-blue-100 text-blue-600";
      case "injury":
        return "bg-red-100 text-red-600";
      case "nutrition":
        return "bg-green-100 text-green-600";
      case "announcements":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Article" />

      <main className="px-4 py-4 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-white">
          <span
            className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(
              article.category
            )}`}
          >
            {getCategoryIcon(article.category)}{" "}
            {article.category.charAt(0).toUpperCase() +
              article.category.slice(1)}
          </span>
          <h1 className="text-xl font-bold mt-3">{article.title}</h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-300">
            <span>{article.author}</span>
            <span>•</span>
            <span>{article.date}</span>
            <span>•</span>
            <span>{article.readTime} read</span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          {article.content.map((block, index) => {
            switch (block.type) {
              case "heading":
                return (
                  <h2
                    key={index}
                    className="text-lg font-semibold text-gray-900 mt-4"
                  >
                    {block.text}
                  </h2>
                );
              case "paragraph":
                return (
                  <p key={index} className="text-gray-700 leading-relaxed">
                    {block.text}
                  </p>
                );
              case "list":
                return (
                  <ul key={index} className="space-y-2 ml-4">
                    {block.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-gray-700"
                      >
                        <span className="text-gray-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              case "tip":
                return (
                  <div key={index} className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span>💡</span>
                      <p className="text-green-800 text-sm">{block.text}</p>
                    </div>
                  </div>
                );
              case "warning":
                return (
                  <div key={index} className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span>⚠️</span>
                      <p className="text-red-800 text-sm">{block.text}</p>
                    </div>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>

        {/* Related Articles */}
        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Related Articles
            </h3>
            <div className="space-y-3">
              {article.relatedArticles.map((relatedId) => {
                const related = mockArticles[relatedId];
                if (!related) return null;
                return (
                  <div
                    key={relatedId}
                    onClick={() => router.push(`/knowledge/${relatedId}`)}
                    className="bg-white rounded-xl p-4 shadow-sm cursor-pointer flex items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">
                        {getCategoryIcon(related.category)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {related.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {related.readTime} read
                      </p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share Button */}
        <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2">
          <span>📤</span>
          Share Article
        </button>
      </main>
    </div>
  );
}
