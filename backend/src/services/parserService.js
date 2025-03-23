// services/parserService.js

/**
 * Parses natural language query into structured parameters
 * without relying on external API calls
 */
exports.parseQuery = async (query) => {
    try {
      console.log("Parsing query:", query);
      
      // Lowercase for easier matching
      const lowerQuery = query.toLowerCase();
      
      // Initialize structured query object
      const structuredQuery = {
        category: null,
        budget: null,
        priority: [],
        brand: []
      };
      
      // 1. Extract product category
      const categoryPatterns = [
        { regex: /earbuds|tws|wireless earphone/i, category: "earbuds" },
        { regex: /noise cancelling|headphone|earphone/i, category: "headphones" },
        { regex: /laptop|notebook|macbook/i, category: "laptop" },
        { regex: /tv|television|smart tv/i, category: "television" },
        { regex: /phone|smartphone|mobile/i, category: "smartphone" },
        { regex: /camera|dslr|mirrorless/i, category: "camera" },
        { regex: /watch|smartwatch/i, category: "smartwatch" },
        { regex: /tablet|ipad/i, category: "tablet" },
        { regex: /speaker|sound bar|soundbar/i, category: "speaker" },
        { regex: /refrigerator|fridge/i, category: "refrigerator" },
        { regex: /washing machine/i, category: "washing_machine" },
        { regex: /ac|air condition/i, category: "air_conditioner" }
      ];
      
      for (const pattern of categoryPatterns) {
        if (pattern.regex.test(lowerQuery)) {
          structuredQuery.category = pattern.category;
          break;
        }
      }
      
      // Default category if none found
      if (!structuredQuery.category) {
        structuredQuery.category = "electronics";
      }
      
      // 2. Extract budget
      // Look for patterns like "under 20000", "below 30k", "less than 25,000"
      const budgetPatterns = [
        { regex: /under (\d+),?(\d+)?/i, multiplier: 1 },
        { regex: /below (\d+),?(\d+)?/i, multiplier: 1 },
        { regex: /less than (\d+),?(\d+)?/i, multiplier: 1 },
        { regex: /budget (\d+),?(\d+)?/i, multiplier: 1 },
        { regex: /around (\d+),?(\d+)?/i, multiplier: 1 },
        { regex: /(\d+),?(\d+)? ?rs/i, multiplier: 1 },
        { regex: /(\d+),?(\d+)? ?rupees/i, multiplier: 1 },
        { regex: /(\d+)k/i, multiplier: 1000 }
      ];
      
      for (const pattern of budgetPatterns) {
        const match = lowerQuery.match(pattern.regex);
        if (match) {
          let budget = 0;
          if (match[2]) {
            // Handle comma-separated numbers like "20,000"
            budget = parseInt(match[1] + match[2]);
          } else {
            budget = parseInt(match[1]) * pattern.multiplier;
          }
          
          structuredQuery.budget = budget;
          break;
        }
      }
      
      // 3. Extract priority features
      const priorityFeatures = [
        { keywords: ["camera", "photo", "photography", "picture", "selfie"], feature: "camera" },
        { keywords: ["battery", "backup", "long lasting", "battery life"], feature: "battery" },
        { keywords: ["performance", "speed", "fast", "processor", "gaming", "snapdragon", "mediatek"], feature: "performance" },
        { keywords: ["display", "screen", "amoled", "lcd", "oled", "resolution"], feature: "display" },
        { keywords: ["storage", "memory", "ram", "gb", "tb"], feature: "storage" },
        { keywords: ["price", "cheap", "budget", "affordable", "value"], feature: "price" },
        { keywords: ["design", "look", "build", "premium"], feature: "design" },
        { keywords: ["speaker", "audio", "sound", "music"], feature: "sound" },
        { keywords: ["light", "weight", "portable", "slim"], feature: "portability" },
        { keywords: ["charging", "fast charge", "quick charge", "supervooc"], feature: "charging" }
      ];
      
      for (const item of priorityFeatures) {
        for (const keyword of item.keywords) {
          if (lowerQuery.includes(keyword)) {
            if (!structuredQuery.priority.includes(item.feature)) {
              structuredQuery.priority.push(item.feature);
            }
            break;
          }
        }
      }
      
      // 4. Extract brand preferences
      const brandNames = [
        "samsung", "apple", "xiaomi", "redmi", "realme", "oneplus", "vivo", "oppo", "poco",
        "nokia", "motorola", "google", "sony", "lg", "asus", "huawei", "honor", "infinix",
        "dell", "hp", "lenovo", "acer", "msi", "microsoft", "alienware", "macbook", "toshiba"
      ];
      
      for (const brand of brandNames) {
        if (lowerQuery.includes(brand)) {
          structuredQuery.brand.push(brand);
        }
      }
      
      // Special case for Apple products
      if (lowerQuery.includes("iphone")) {
        structuredQuery.brand.push("apple");
      }
      
      // Special case for certain categories that might not be explicitly mentioned
      if (lowerQuery.includes("macbook") || lowerQuery.includes("imac")) {
        structuredQuery.category = "laptop";
        structuredQuery.brand.push("apple");
      }
      
      // 5. Add default priorities if none found
      if (structuredQuery.priority.length === 0) {
        // Based on category, add default priorities
        switch (structuredQuery.category) {
          case "smartphone":
            structuredQuery.priority.push("performance", "camera");
            break;
          case "laptop":
            structuredQuery.priority.push("performance", "display");
            break;
          case "television":
            structuredQuery.priority.push("display", "sound");
            break;
          case "headphones":
            structuredQuery.priority.push("sound", "battery");
            break;
          default:
            structuredQuery.priority.push("performance");
        }
      }
      
      // 6. Handle "best" requests by making performance a priority
      if (lowerQuery.includes("best") && !structuredQuery.priority.includes("performance")) {
        structuredQuery.priority.unshift("performance");
      }
      
      // 7. Extract additional context
      // Gaming-related
      if (lowerQuery.includes("gaming") || lowerQuery.includes("game")) {
        if (structuredQuery.category === "smartphone" || structuredQuery.category === "laptop") {
          if (!structuredQuery.priority.includes("performance")) {
            structuredQuery.priority.unshift("performance");
          }
        }
      }
      
      // Camera-related
      if (lowerQuery.includes("photography") || lowerQuery.includes("picture") || lowerQuery.includes("photo")) {
        if (structuredQuery.category === "smartphone" && !structuredQuery.priority.includes("camera")) {
          structuredQuery.priority.unshift("camera");
        }
      }
      
      // Battery-related
      if (lowerQuery.includes("long lasting") || lowerQuery.includes("all day")) {
        if (!structuredQuery.priority.includes("battery")) {
          structuredQuery.priority.push("battery");
        }
      }
      
      console.log("Structured query:", structuredQuery);
      return structuredQuery;
    } catch (error) {
      console.error('Error parsing query:', error);
      
      // Return basic structured query in case of error
      return {
        category: "smartphone",
        budget: 20000,
        priority: ["performance", "camera"],
        brand: []
      };
    }
  };