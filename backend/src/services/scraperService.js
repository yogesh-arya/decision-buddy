// services/scraperService.js
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const OpenAI = require('../config/openai');

/**
 * Fetches products based on structured query parameters
 * Enhanced to better handle Flipkart's structure
 */
exports.fetchProducts = async (structuredQuery) => {
    try {
        console.log("Starting real-time scraping from Flipkart...");
        const { category, budget, priority, brand } = structuredQuery;

        // Construct search query with all parameters
        let searchQuery = category || '';

        if (brand && brand.length > 0) {
            searchQuery += ' ' + brand.join(' ');
        }

        if (priority && priority.length > 0) {
            searchQuery += ' ' + priority.join(' ');
        }

        if (budget) {
            searchQuery += ` under ${budget}`;
        }

        console.log(`Search query: "${searchQuery}"`);

        // Launch puppeteer with additional options for stability
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        });

        const page = await browser.newPage();

        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

        // Add additional headers to look more like a real browser
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive'
        });

        // Go to Flipkart search results with proper encoding
        const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`;
        console.log(`Navigating to: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for search results to load with a more reliable selector
        try {
            // Wait for product grid to appear
            await page.waitForSelector('[data-id]', { timeout: 10000 });
            console.log("Product grid loaded successfully");
        } catch (error) {
            console.log("Timeout waiting for product grid, checking alternative selectors...");

            // Try alternative selectors if the main one fails
            try {
                await page.waitForSelector('div._1AtVbE', { timeout: 5000 });
                console.log("Found alternative product grid");
            } catch (innerError) {
                console.log("Alternative selector also failed, trying basic page content");
                await page.waitForSelector('body', { timeout: 3000 });
            }
        }

        // Take a screenshot for debugging (comment out in production)
        // await page.screenshot({ path: 'flipkart-results.png' });

        // Get the page content
        const content = await page.content();
        console.log(`Page content retrieved, length: ${content.length} characters`);

        // Close the browser
        await browser.close();

        // Use cheerio to parse the HTML content
        const $ = cheerio.load(content);

        // Extract product information
        const products = [];
        let productCount = 0;

        // Check for typical product card patterns on Flipkart
        // Note: These selectors may need updates if Flipkart changes their site

        // First try the standard product card selector
        $('div._1AtVbE').each((index, element) => {
            if (index >= 15) return; // Limit to 15 products for the POC

            const productCard = $(element);

            // Extract product details - handling multiple potential selectors
            const titleElement = productCard.find('div._4rR01T, a.s1Q9rs, div.b79Nlmn');
            const priceElement = productCard.find('div._30jeq3, div._30jeq3._1_WHN1');
            const ratingElement = productCard.find('div._3LWZlK, div._3Ay6Sb');
            const featuresElement = productCard.find('ul._1xgFaf, div._3Djpdu');

            // Only process elements that have the necessary data
            if (titleElement.length && priceElement.length) {
                const title = titleElement.text().trim();

                // Convert price from "₹20,999" format to number
                const priceText = priceElement.text().trim();
                const price = parseInt(priceText.replace(/[^0-9]/g, ''));

                // Only include products within budget if specified
                if (!budget || price <= budget) {
                    const rating = ratingElement.length ? parseFloat(ratingElement.text().trim()) : null;

                    // Extract features list
                    const features = [];
                    featuresElement.find('li, span').each((i, el) => {
                        const featureText = $(el).text().trim();
                        if (featureText && featureText.length > 3) { // Filter out very short texts
                            features.push(featureText);
                        }
                    });

                    // If no features found, try to get from the product description
                    if (features.length === 0) {
                        const descElement = productCard.find('div._1a8UBa, div._3Djpdu');
                        if (descElement.length) {
                            const descText = descElement.text().trim();
                            if (descText) {
                                features.push(descText);
                            }
                        }
                    }

                    // Get product link for more details
                    const productLink = productCard.find('a[href*="/p/"]').attr('href');
                    const fullProductLink = productLink ? `https://www.flipkart.com${productLink}` : null;

                    // Try to get image
                    let imageUrl = null;
                    const imgElement = productCard.find('img').first();
                    if (imgElement.length) {
                        imageUrl = imgElement.attr('src');
                    }

                    // Generate a unique ID for this product
                    const id = `product-${productCount}-${Date.now()}`;
                    productCount++;

                    // Create dummy reviews for POC - in a real app, you'd scrape these too
                    const reviews = [
                        "Battery lasts all day, camera is average at night",
                        "Great performance for the price, screen is bright",
                        "Value for money product, but camera could be better",
                        "Fast charging and good build quality"
                    ];

                    products.push({
                        id,
                        title,
                        price,
                        rating,
                        features,
                        reviews,
                        productUrl: fullProductLink,
                        image: imageUrl || `https://via.placeholder.com/200x200?text=${encodeURIComponent(title.substring(0, 10))}`
                    });
                }
            }
        });

        console.log(`Extracted ${products.length} products from Flipkart`);

        // If we found products, return them
        if (products.length > 0) {
            return products;
        }

        // If the standard selector didn't work, try an alternative for mobile view or other layouts
        if (products.length === 0) {
            console.log("Trying alternative product selectors...");

            // Try a different selector pattern that might be used
            $('div._2kHMtA, div._4ddWXP, div._1xHGtK, div._3pLy-c').each((index, element) => {
                if (index >= 15) return;

                const altProductCard = $(element);
                const altTitleElement = altProductCard.find('a.IRpwTa, a._2rpwqI, a.s1Q9rs, div._3wU53n');
                const altPriceElement = altProductCard.find('div._30jeq3, span._25b18c');

                if (altTitleElement.length && altPriceElement.length) {
                    const title = altTitleElement.text().trim();
                    const priceText = altPriceElement.text().trim();
                    const price = parseInt(priceText.replace(/[^0-9]/g, ''));

                    if (!budget || price <= budget) {
                        // Generate a unique ID for this product
                        const id = `alt-product-${productCount}-${Date.now()}`;
                        productCount++;

                        products.push({
                            id,
                            title,
                            price,
                            rating: null,
                            features: ["Feature details not available in this view"],
                            reviews: ["Review details not available in this view"],
                            image: `https://via.placeholder.com/200x200?text=${encodeURIComponent(title.substring(0, 10))}`
                        });
                    }
                }
            });

            console.log(`Found ${products.length} products with alternative selectors`);
        }

        // If we still don't have products, fall back to mock data
        if (products.length === 0) {
            console.log("No products found with any selectors, falling back to mock data");
            return getMockProducts(structuredQuery);
        }

        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        console.log("Falling back to mock data due to scraping error");

        // Return mock data for POC in case of error
        return getMockProducts(structuredQuery);
    }
};

/**
 * Structures reviews using AI
 */
exports.structureReviews = async (product) => {
    try {
        // For POC, we'll use a mock implementation instead of OpenAI
        // to avoid API costs/limits
        console.log(`Structuring reviews for product: ${product.id}`);

        const reviewsText = product.reviews.join('\n');

        // Generate sentiment based on product features and title
        const structuredReviews = {};

        // Add battery sentiment
        if (product.title.toLowerCase().includes('redmi') ||
            product.title.toLowerCase().includes('xiaomi') ||
            product.title.toLowerCase().includes('realme')) {
            structuredReviews.battery = "excellent, lasts all day";
        } else if (product.title.toLowerCase().includes('samsung')) {
            structuredReviews.battery = "good, but could be better";
        } else {
            structuredReviews.battery = "average";
        }

        // Add camera sentiment
        if (product.features.some(f => f.toLowerCase().includes('48mp') || f.toLowerCase().includes('64mp'))) {
            structuredReviews.camera = "excellent in daylight, good in low light";
        } else if (product.features.some(f => f.toLowerCase().includes('camera'))) {
            structuredReviews.camera = "good in daylight, average in low light";
        } else {
            structuredReviews.camera = "average";
        }

        // Add performance sentiment
        if (product.features.some(f =>
            f.toLowerCase().includes('snapdragon') ||
            f.toLowerCase().includes('dimensity') ||
            f.toLowerCase().includes('8 gb'))) {
            structuredReviews.performance = "excellent, handles all tasks smoothly";
        } else {
            structuredReviews.performance = "good for daily use";
        }

        // Add display sentiment
        if (product.features.some(f =>
            f.toLowerCase().includes('amoled') ||
            f.toLowerCase().includes('super amoled'))) {
            structuredReviews.display = "excellent, vibrant colors";
        } else if (product.features.some(f => f.toLowerCase().includes('lcd'))) {
            structuredReviews.display = "good, but not as vibrant as AMOLED";
        } else {
            structuredReviews.display = "decent";
        }

        // Set overall sentiment
        const sentiments = Object.values(structuredReviews);
        if (sentiments.some(s => s.includes('excellent'))) {
            structuredReviews.sentiment = "very positive";
        } else if (sentiments.every(s => s.includes('average'))) {
            structuredReviews.sentiment = "mixed";
        } else {
            structuredReviews.sentiment = "positive";
        }

        return structuredReviews;
    } catch (error) {
        console.error('Error structuring reviews:', error);

        // Return mock structured reviews for POC in case of error
        return {
            "battery": "good",
            "camera": "average in low light",
            "performance": "good for daily use",
            "display": "bright and vibrant",
            "sentiment": "positive"
        };
    }
};

/**
 * Helper function to return mock products with local image paths
 */
function getMockProducts(structuredQuery) {
    const { category, budget, priority, brand } = structuredQuery;
    
    // Return appropriate mock data based on category
    if (category?.toLowerCase().includes('smartphone') || 
        category?.toLowerCase().includes('phone') || 
        category?.toLowerCase().includes('mobile')) {
        
      // Select brands based on query if specified
      let phoneBrands = [];
      if (brand && brand.length > 0) {
        phoneBrands = brand;
      }
      
      // Base phone products
      let phoneProducts = [
        {
          id: 'mock-1',
          title: 'Redmi Note 12 Pro 5G (Glacier Blue, 128 GB)',
          price: 18999,
          rating: 4.3,
          features: [
            '50MP AI Triple Camera',
            '5000mAh Battery',
            '6GB RAM, 128GB Storage',
            'Snapdragon 685 Processor',
            'FHD+ AMOLED Display'
          ],
          reviews: [
            "Battery lasts all day, camera is average at night",
            "Great performance for the price, screen is bright",
            "Value for money product, but camera could be better"
          ],
          image: '/images/products/redmi-note-12-pro.jpg'
        },
        {
          id: 'mock-2',
          title: 'Realme Narzo 60 5G (Mars Orange, 128 GB)',
          price: 15999,
          rating: 4.1,
          features: [
            '48MP Triple Camera',
            '5000mAh Battery with 33W Fast Charging',
            '4GB RAM, 64GB Storage',
            'MediaTek Helio G96',
            '6.4" Super AMOLED Display'
          ],
          reviews: [
            "Good battery life, charges quickly",
            "Camera is decent in daylight, struggles in low light",
            "Gaming performance is smooth for this price range"
          ],
          image: '/images/products/realme-narzo-60.jpg'
        },
        {
          id: 'mock-3',
          title: 'Samsung Galaxy M34 5G (Midnight Blue, 128 GB)',
          price: 19499,
          rating: 4.4,
          features: [
            '50MP Quad Camera',
            '6000mAh Battery',
            '6GB RAM, 128GB Storage',
            'Exynos 1280 Processor',
            '6.5" Super AMOLED Display'
          ],
          reviews: [
            "Excellent battery life, lasts two days",
            "Camera quality is good, night mode works well",
            "OneUI is smooth and responsive"
          ],
          image: '/images/products/samsung-galaxy-m34.jpg'
        },
        {
          id: 'mock-4',
          title: 'Samsung Galaxy S21 FE 5G (Graphite, 128 GB)',
          price: 24999,
          rating: 4.5,
          features: [
            '12MP Triple Camera with OIS',
            '4500mAh Battery with Fast Charging',
            '8GB RAM, 128GB Storage',
            'Exynos 2100 Processor',
            '6.4" Dynamic AMOLED Display'
          ],
          reviews: [
            "Premium build quality, feels great in hand",
            "Camera is excellent in all lighting conditions",
            "Performance is top-notch for gaming and multitasking"
          ],
          image: '/images/products/samsung-galaxy-s21-fe.jpg'
        },
        {
          id: 'mock-5',
          title: 'OnePlus Nord CE 3 Lite 5G (Chromatic Gray, 128 GB)',
          price: 19999,
          rating: 4.3,
          features: [
            '108MP Main Camera',
            '5000mAh Battery with 67W SuperVOOC Charging',
            '8GB RAM, 128GB Storage',
            'Snapdragon 695 5G Processor',
            '6.72" 120Hz LCD Display'
          ],
          reviews: [
            "Fast charging is incredible, full charge in under 45 minutes",
            "Camera performs well for the price point",
            "Clean OxygenOS experience with minimal bloatware"
          ],
          image: '/images/products/oneplus-nord-ce3-lite.jpg'
        }
      ];
      
      // Filter by brand if specified
      if (phoneBrands.length > 0) {
        phoneProducts = phoneProducts.filter(product => {
          return phoneBrands.some(brand => 
            product.title.toLowerCase().includes(brand.toLowerCase())
          );
        });
        
        // If no products match the brand, return at least one generic product
        if (phoneProducts.length === 0) {
          phoneProducts = [
            {
              id: `mock-brand-${phoneBrands[0]}`,
              title: `${phoneBrands[0].charAt(0).toUpperCase() + phoneBrands[0].slice(1)} Smartphone (Black, 128 GB)`,
              price: budget ? budget - 2000 : 19999,
              rating: 4.2,
              features: [
                '48MP Camera',
                '5000mAh Battery',
                '6GB RAM, 128GB Storage',
                'Octa-core Processor',
                'Full HD+ Display'
              ],
              reviews: [
                "Good overall performance",
                "Decent battery life",
                "Camera performs well in daylight"
              ],
              image: `/images/products/${phoneBrands[0].toLowerCase()}-smartphone.jpg`
            }
          ];
        }
      }
      
      // Filter by budget if specified
      if (budget) {
        phoneProducts = phoneProducts.filter(product => product.price <= budget);
        
        // If no products within budget, return at least one
        if (phoneProducts.length === 0) {
          phoneProducts = [
            {
              id: 'mock-budget',
              title: `Budget Smartphone under ${budget}`,
              price: budget - 1000,
              rating: 4.0,
              features: [
                'Decent Camera',
                'Standard Battery',
                '4GB RAM, 64GB Storage',
                'Entry-level Processor',
                'HD+ Display'
              ],
              reviews: [
                "Good value for money",
                "Meets basic requirements",
                "Decent performance for the price"
              ],
              image: '/images/products/budget-smartphone.jpg'
            }
          ];
        }
      }
      
      return phoneProducts;
      
    } else if (category?.toLowerCase().includes('laptop')) {
      // Laptop products
      let laptopProducts = [
        {
          id: 'mock-laptop-1',
          title: 'HP Pavilion 14 (i5-11th Gen, 16GB RAM, 512GB SSD)',
          price: 55999,
          rating: 4.2,
          features: [
            'Intel Core i5-1135G7',
            '16GB DDR4 RAM',
            '512GB NVMe SSD',
            '14" Full HD IPS Display',
            'Windows 11 Home',
            'Backlit Keyboard'
          ],
          reviews: [
            "Great performance for the price",
            "Battery lasts about 6 hours with normal usage",
            "Display is bright and vibrant"
          ],
          image: '/images/products/hp-pavilion-14.jpg'
        },
        {
          id: 'mock-laptop-2',
          title: 'Lenovo Ideapad Slim 3 (i3-12th Gen, 8GB RAM, 256GB SSD)',
          price: 42999,
          rating: 4.0,
          features: [
            'Intel Core i3-1215U',
            '8GB DDR4 RAM',
            '256GB NVMe SSD',
            '15.6" Full HD Display',
            'Windows 11 Home'
          ],
          reviews: [
            "Good everyday performance",
            "Decent battery life",
            "Great value for money"
          ],
          image: '/images/products/lenovo-ideapad-slim-3.jpg'
        },
        {
          id: 'mock-laptop-3',
          title: 'ASUS TUF Gaming F15 (i5-11th Gen, 16GB RAM, 512GB SSD, RTX 3050)',
          price: 64999,
          rating: 4.3,
          features: [
            'Intel Core i5-11400H',
            '16GB DDR4 RAM',
            '512GB NVMe SSD',
            'NVIDIA RTX 3050 4GB Graphics',
            '15.6" Full HD 144Hz Display',
            'RGB Backlit Keyboard'
          ],
          reviews: [
            "Excellent gaming performance at this price",
            "Good thermal management even during extended gaming",
            "Display is great for gaming with 144Hz refresh rate"
          ],
          image: '/images/products/asus-tuf-gaming-f15.jpg'
        },
        {
          id: 'mock-laptop-4',
          title: 'Dell Inspiron 15 (Ryzen 5, 8GB RAM, 512GB SSD)',
          price: 49999,
          rating: 4.1,
          features: [
            'AMD Ryzen 5 5500U',
            '8GB DDR4 RAM',
            '512GB SSD Storage',
            '15.6" Full HD Anti-Glare Display',
            'Windows 11',
            'MS Office Home & Student 2021'
          ],
          reviews: [
            "Solid performance for productivity tasks",
            "Good build quality and sleek design",
            "Sharp display with good color accuracy"
          ],
          image: '/images/products/dell-inspiron-15.jpg'
        }
      ];
      
      // Filter by brand if specified
      if (brand && brand.length > 0) {
        laptopProducts = laptopProducts.filter(product => {
          return brand.some(b => 
            product.title.toLowerCase().includes(b.toLowerCase())
          );
        });
        
        // If no products match the brand, return at least one generic product
        if (laptopProducts.length === 0) {
          laptopProducts = [
            {
              id: `mock-laptop-brand-${brand[0]}`,
              title: `${brand[0].charAt(0).toUpperCase() + brand[0].slice(1)} Laptop (i5, 8GB RAM, 512GB SSD)`,
              price: budget ? budget - 5000 : 49999,
              rating: 4.1,
              features: [
                'Intel Core i5 Processor',
                '8GB RAM',
                '512GB SSD Storage',
                '15.6" Full HD Display',
                'Windows 11'
              ],
              reviews: [
                "Solid performance for everyday tasks",
                "Good build quality",
                "Decent battery life"
              ],
              image: `/images/products/${brand[0].toLowerCase()}-laptop.jpg`
            }
          ];
        }
      }
      
      // Filter by budget if specified
      if (budget) {
        laptopProducts = laptopProducts.filter(product => product.price <= budget);
        
        // If no products within budget, return at least one
        if (laptopProducts.length === 0) {
          laptopProducts = [
            {
              id: 'mock-budget-laptop',
              title: `Budget Laptop under ${budget}`,
              price: budget - 2000,
              rating: 3.9,
              features: [
                'Intel Core i3 Processor',
                '4GB RAM',
                '256GB SSD Storage',
                '14" HD Display',
                'Windows 11'
              ],
              reviews: [
                "Good for basic tasks and web browsing",
                "Lightweight and portable",
                "Decent value for the price"
              ],
              image: '/images/products/budget-laptop.jpg'
            }
          ];
        }
      }
      
      return laptopProducts;
      
    } else if (category?.toLowerCase().includes('headphone') || 
               category?.toLowerCase().includes('earphone') || 
               category?.toLowerCase() === 'earbuds' ||
               category?.toLowerCase().includes('earbud')) {
      // Headphone/earphone products
      let audioProducts = [];
      
      // Check if it's specifically earbuds
      if (category?.toLowerCase() === 'earbuds' || 
          category?.toLowerCase().includes('earbud') ||
          category?.toLowerCase().includes('tws')) {
        audioProducts = [
          {
            id: 'mock-earbuds-1',
            title: 'boAt Airdopes 141 True Wireless Earbuds',
            price: 1499,
            rating: 4.2,
            features: [
              'Bluetooth 5.0',
              'Up to 42 Hours Total Playback',
              '8mm Drivers',
              'IPX4 Water Resistance',
              'Voice Assistant Support',
              'Type-C Charging Case'
            ],
            reviews: [
              "Great sound quality for the price",
              "Battery life is impressive",
              "Comfortable for long usage"
            ],
            image: '/images/products/boat-airdopes-141.jpg'
          },
          {
            id: 'mock-earbuds-2',
            title: 'OnePlus Nord Buds 2 True Wireless Earbuds',
            price: 2999,
            rating: 4.3,
            features: [
              '12.4mm Titanium Drivers',
              'Active Noise Cancellation',
              'Up to 36 Hours Playback',
              'IP55 Dust and Water Resistance',
              'Fast Charging',
              'Low Latency Mode'
            ],
            reviews: [
              "Sound quality is rich and balanced",
              "ANC works well for the price point",
              "Call quality is clear and crisp"
            ],
            image: '/images/products/oneplus-nord-buds-2.jpg'
          },
          {
            id: 'mock-earbuds-3',
            title: 'Noise Buds VS104 True Wireless Earbuds',
            price: 1299,
            rating: 4.0,
            features: [
              'Bluetooth 5.2',
              'Up to 30 Hours Total Playback',
              'Environmental Noise Cancellation',
              'Quad Mic System',
              'Low Latency Gaming Mode',
              'IPX5 Water Resistance'
            ],
            reviews: [
              "Good sound signature with punchy bass",
              "Comfortable fit for extended wear",
              "Great value for the features offered"
            ],
            image: '/images/products/noise-buds-vs104.jpg'
          },
          {
            id: 'mock-earbuds-4',
            title: 'realme Buds Air 3 Neo True Wireless Earbuds',
            price: 1799,
            rating: 4.1,
            features: [
              '10mm Bass Boost Driver',
              'Up to 30 Hours Total Playback',
              'AI Environmental Noise Cancellation',
              'Bluetooth 5.2',
              'Low Latency Gaming Mode',
              'IPX5 Water Resistance'
            ],
            reviews: [
              "Impressive bass response for the price",
              "Battery life matches the advertised claims",
              "Good microphone quality for calls"
            ],
            image: '/images/products/realme-buds-air-3.jpg'
          }
        ];
      } else {
        // Regular headphones
        audioProducts = [
          {
            id: 'mock-headphone-1',
            title: 'boAt Rockerz 450 Bluetooth On-Ear Headphones',
            price: 1499,
            rating: 4.2,
            features: [
              'Bluetooth 5.0',
              'Up to 15 Hours Playback',
              '40mm Dynamic Drivers',
              'Padded Ear Cushions',
              'Built-in Microphone',
              'Foldable Design'
            ],
            reviews: [
              "Great sound quality for the price",
              "Comfortable for long usage sessions",
              "Battery life is impressive"
            ],
            image: '/images/products/boat-rockerz-450.jpg'
          },
          {
            id: 'mock-headphone-2',
            title: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
            price: 19990,
            rating: 4.7,
            features: [
              'Industry-leading Noise Cancellation',
              'Up to 30 Hours Battery Life',
              'Touch Controls',
              'Speak-to-Chat Feature',
              'Wear Detection',
              'Multi-device Connection'
            ],
            reviews: [
              "Best noise cancellation in the market",
              "Sound quality is exceptional",
              "Very comfortable for long flights"
            ],
            image: '/images/products/sony-wh-1000xm4.jpg'
          },
          {
            id: 'mock-headphone-3',
            title: 'JBL Tune 760NC Wireless Headphones',
            price: 5999,
            rating: 4.3,
            features: [
              'Active Noise Cancellation',
              'Up to 35 Hours Playback',
              '40mm Drivers',
              'Hands-free Calls',
              'Voice Assistant Support',
              'Foldable Design'
            ],
            reviews: [
              "Good noise cancellation for the price",
              "Bass is powerful and punchy",
              "Comfortable fit for extended use"
            ],
            image: '/images/products/jbl-tune-760nc.jpg'
          }
        ];
      }
      
      // Filter by budget if specified
      if (budget) {
        audioProducts = audioProducts.filter(product => product.price <= budget);
        
        // If no products within budget, return at least one
        if (audioProducts.length === 0) {
          const isEarbuds = category?.toLowerCase() === 'earbuds' || 
                           category?.toLowerCase().includes('earbud') ||
                           category?.toLowerCase().includes('tws');
          
          audioProducts = [
            {
              id: isEarbuds ? 'mock-budget-earbuds' : 'mock-budget-headphones',
              title: isEarbuds ? `Budget Wireless Earbuds under ${budget}` : `Budget Headphones under ${budget}`,
              price: budget - 500,
              rating: 3.8,
              features: [
                'Wireless Bluetooth',
                isEarbuds ? 'Up to 10 Hours Total Playback' : 'Up to 8 Hours Playback',
                isEarbuds ? '10mm Drivers' : '32mm Drivers',
                isEarbuds ? 'IPX4 Water Resistance' : 'Built-in Microphone',
                'Lightweight Design'
              ],
              reviews: [
                "Decent sound for the price",
                "Battery life is adequate",
                "Good for casual listening"
              ],
              image: isEarbuds ? '/images/products/budget-earbuds.jpg' : '/images/products/budget-headphones.jpg'
            }
          ];
        }
      }
      
      return audioProducts;
      
    } else if (category?.toLowerCase().includes('watch') || 
               category?.toLowerCase().includes('smartwatch')) {
      // Smartwatch products
      let watchProducts = [
        {
          id: 'mock-watch-1',
          title: 'Noise ColorFit Pro 3 Smartwatch',
          price: 3999,
          rating: 4.1,
          features: [
            '1.55" TFT LCD Display',
            'SpO2 Monitoring',
            '24/7 Heart Rate Tracking',
            'IP68 Water Resistant',
            '10-day Battery Life',
            '14 Sports Modes'
          ],
          reviews: [
            "Great value for money smartwatch",
            "Battery life is excellent",
            "Health tracking features work well"
          ],
          image: '/images/products/noise-colorfit-pro-3.jpg'
        },
        {
          id: 'mock-watch-2',
          title: 'boAt Storm Smartwatch',
          price: 2499,
          rating: 4.0,
          features: [
            '1.3" Touch Screen',
            'Heart Rate Monitor',
            'Sleep Tracking',
            '5 ATM Water Resistance',
            '7-day Battery Life',
            'Multiple Sports Modes'
          ],
          reviews: [
            "Good fitness tracking capabilities",
            "Display is bright and responsive",
            "Light and comfortable to wear all day"
          ],
          image: '/images/products/boat-storm-smartwatch.jpg'
        },
        {
          id: 'mock-watch-3',
          title: 'Samsung Galaxy Watch 4 (Bluetooth, 44mm)',
          price: 11999,
          rating: 4.4,
          features: [
            '1.4" Super AMOLED Display',
            'Body Composition Analysis',
            'ECG & Blood Pressure Monitoring',
            'Advanced Sleep Analysis',
            'Wear OS Powered by Samsung',
            '40+ Hours Battery Life'
          ],
          reviews: [
            "Excellent health tracking features",
            "Smooth performance and good app integration",
            "Premium build quality and comfortable band"
          ],
          image: '/images/products/samsung-galaxy-watch-4.jpg'
        }
      ];
      
      // Filter by budget if specified
      if (budget) {
        watchProducts = watchProducts.filter(product => product.price <= budget);
        
        // If no products within budget, return at least one
        if (watchProducts.length === 0) {
          watchProducts = [
            {
              id: 'mock-budget-watch',
              title: `Budget Smartwatch under ${budget}`,
              price: budget - 500,
              rating: 3.7,
              features: [
                '1.3" Display',
                'Heart Rate Monitor',
                'Sleep Tracking',
                'Water Resistant',
                '5-day Battery Life',
                'Basic Activity Tracking'
              ],
              reviews: [
                "Good entry-level smartwatch",
                "Battery lasts for several days",
                "Does the basic functions well"
              ],
              image: '/images/products/budget-smartwatch.jpg'
            }
          ];
        }
      }
      
      return watchProducts;
      
    } else {
      // Generic products for other categories
      return [
        {
          id: 'mock-generic-1',
          title: `Best ${category || 'Product'} 1`,
          price: budget ? Math.min(budget - 1000, 15000) : 15000,
          rating: 4.2,
          features: [
            'Feature 1',
            'Feature 2',
            'Feature 3'
          ],
          reviews: [
            "Great product for the price",
            "Meets all my requirements",
            "Would recommend to others"
          ],
          image: `/images/products/generic-${category || 'product'}-1.jpg`
        },
        {
          id: 'mock-generic-2',
          title: `Premium ${category || 'Product'} 2`,
          price: budget ? Math.min(budget, 25000) : 25000,
          rating: 4.5,
          features: [
            'Premium Feature 1',
            'Premium Feature 2',
            'Premium Feature 3'
          ],
          reviews: [
            "Excellent quality and performance",
            "Worth every penny",
            "Superior to other brands I've tried"
          ],
          image: `/images/products/generic-${category || 'product'}-2.jpg`
        }
      ];
    }
  }

/**
 * Placeholder for future enhancement: method to scrape reviews for a product
 */
exports.fetchProductReviews = async (productUrl) => {
    // This would be implemented in a production version
    // to actually scrape the reviews page of each product
    return [
        "Battery lasts all day, camera is average at night",
        "Great performance for the price, screen is bright",
        "Value for money product, but camera could be better"
    ];
};