// services/summarizerService.js

/**
 * Generates product recommendations based on structured query and products
 * without relying on external API calls
 */
exports.generateRecommendation = async (structuredQuery, products) => {
    try {
      console.log("Generating recommendations based on", products.length, "products");
      
      if (!products || products.length === 0) {
        throw new Error("No products available for recommendation");
      }
      
      // Scoring system for product ranking
      const scoredProducts = products.map(product => {
        let score = 0;
        const { category, budget, priority, brand } = structuredQuery;
        
        // Base score from rating
        if (product.rating) {
          score += product.rating * 10; // Up to 50 points for 5-star rating
        }
        
        // Price score - rewards products that are closer to but under budget
        if (budget) {
          if (product.price <= budget) {
            // Higher score for products closer to budget (better specs)
            const priceFactor = product.price / budget;
            // Give up to 30 points based on how close to budget
            score += 30 * priceFactor;
          } else {
            // Penalize products above budget
            score -= 50;
          }
        }
        
        // Priority features matching
        if (priority && priority.length > 0) {
          priority.forEach(feature => {
            // Check title for priority mentions
            if (product.title.toLowerCase().includes(feature.toLowerCase())) {
              score += 15;
            }
            
            // Check features list for priority mentions
            let featureFound = false;
            product.features.forEach(productFeature => {
              if (productFeature.toLowerCase().includes(feature.toLowerCase())) {
                featureFound = true;
              }
            });
            
            if (featureFound) {
              score += 20;
            }
            
            // Check if structured reviews mention this feature positively
            if (product.structuredReviews) {
              const reviewKeys = Object.keys(product.structuredReviews);
              for (const key of reviewKeys) {
                if (key.toLowerCase().includes(feature.toLowerCase())) {
                  const sentiment = product.structuredReviews[key].toLowerCase();
                  if (sentiment.includes("excellent") || sentiment.includes("great")) {
                    score += 25;
                  } else if (sentiment.includes("good")) {
                    score += 15;
                  } else if (sentiment.includes("average")) {
                    score += 5;
                  }
                  break;
                }
              }
            }
          });
        }
        
        // Brand preference matching
        if (brand && brand.length > 0) {
          brand.forEach(brandName => {
            if (product.title.toLowerCase().includes(brandName.toLowerCase())) {
              score += 25;
            }
          });
        }
        
        return { ...product, score };
      });
      
      // Sort products by score (highest first)
      scoredProducts.sort((a, b) => b.score - a.score);
      
      // Get top products for recommendation
      const topProducts = scoredProducts.slice(0, Math.min(3, scoredProducts.length));
      const topPicks = topProducts.map(product => product.id);
      const bestProduct = topProducts[0];
      
      // Generate the recommendation text
      let recommendation = "";
      
      // Introduction based on query
      recommendation += `Based on your search for ${structuredQuery.category || "products"}`;
      if (structuredQuery.budget) {
        recommendation += ` under ₹${structuredQuery.budget.toLocaleString()}`;
      }
      if (structuredQuery.priority && structuredQuery.priority.length > 0) {
        recommendation += ` with good ${structuredQuery.priority.join(" and ")}`;
      }
      recommendation += `, I've analyzed the available options.\n\n`;
      
      // Best product recommendation
      recommendation += `**${bestProduct.title}** stands out as the best choice`;
      if (structuredQuery.priority && structuredQuery.priority.length > 0) {
        recommendation += ` for ${structuredQuery.priority.join(" and ")}`;
      }
      recommendation += `. Priced at ₹${bestProduct.price.toLocaleString()}, it `;
      
      // Add price context
      if (structuredQuery.budget) {
        const priceDifference = structuredQuery.budget - bestProduct.price;
        if (priceDifference > 0) {
          recommendation += `is ₹${priceDifference.toLocaleString()} below your budget and `;
        }
      }
      
      // Add key strengths
      recommendation += `offers excellent value.\n\n`;
      
      // Key features section
      recommendation += `**Key Highlights:**\n`;
      
      // Extract the most relevant features based on priorities
      const relevantFeatures = [];
      if (structuredQuery.priority && structuredQuery.priority.length > 0) {
        // Try to find features that match priorities
        structuredQuery.priority.forEach(priority => {
          bestProduct.features.forEach(feature => {
            if (feature.toLowerCase().includes(priority.toLowerCase())) {
              relevantFeatures.push(feature);
            }
          });
        });
      }
      
      // If no priority matches, use the first 3 features
      if (relevantFeatures.length === 0) {
        relevantFeatures.push(...bestProduct.features.slice(0, 3));
      }
      
      // Add features to recommendation
      relevantFeatures.forEach(feature => {
        recommendation += `- ${feature}\n`;
      });
      
      // Add user sentiment from structured reviews
      if (bestProduct.structuredReviews) {
        recommendation += `\n**User Feedback:**\n`;
        
        // Filter out the sentiment field
        const reviews = Object.entries(bestProduct.structuredReviews)
          .filter(([key]) => key !== 'sentiment')
          .slice(0, 3);
        
        reviews.forEach(([feature, sentiment]) => {
          recommendation += `- ${feature.charAt(0).toUpperCase() + feature.slice(1)}: ${sentiment}\n`;
        });
        
        // Add overall sentiment
        if (bestProduct.structuredReviews.sentiment) {
          recommendation += `\nOverall, users have a **${bestProduct.structuredReviews.sentiment}** impression of this product.\n`;
        }
      }
      
      // Add alternatives if available
      if (topProducts.length > 1) {
        recommendation += `\n**Alternatives to Consider:**\n`;
        
        for (let i = 1; i < topProducts.length; i++) {
          const alternative = topProducts[i];
          recommendation += `- **${alternative.title}** (₹${alternative.price.toLocaleString()})`;
          
          // Add comparison with the best product
          if (alternative.price < bestProduct.price) {
            recommendation += ` - More affordable option, saving you ₹${(bestProduct.price - alternative.price).toLocaleString()}`;
          } else if (alternative.price > bestProduct.price) {
            const extraFeatures = alternative.features.filter(f => 
              !bestProduct.features.some(bf => bf.toLowerCase().includes(f.toLowerCase()))
            ).slice(0, 1);
            
            if (extraFeatures.length > 0) {
              recommendation += ` - Offers ${extraFeatures[0]}`;
            } else {
              recommendation += ` - Higher-end alternative`;
            }
          }
          
          recommendation += `\n`;
        }
      }
      
      // Conclusion
      recommendation += `Based on your search for ${structuredQuery.category || "products"}`;
      if (structuredQuery.budget) {
        // Format the budget properly with thousand separators
        const formattedBudget = new Intl.NumberFormat('en-IN', { 
          maximumFractionDigits: 0 
        }).format(structuredQuery.budget);
        
        recommendation += ` under ₹${formattedBudget}`;
      }
      return {
        recommendation,
        topPicks
      };
    } catch (error) {
      console.error('Error generating recommendation:', error);
      
      // Return basic recommendation in case of error
      const firstProduct = products[0] || { title: 'recommended product', id: 'unknown' };
      return {
        recommendation: `Based on your search, the ${firstProduct.title} appears to be a good match for your requirements. It offers a good balance of features and value.`,
        topPicks: [firstProduct.id]
      };
    }
  };