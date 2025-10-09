const mongoose = require('mongoose');
const State = require('../db/models/state');
const Warehouse = require('../db/models/warehouse');
const History = require('../db/models/history');
const User = require('../db/models/user');

class WarehouseController {
    // Move item from warehouse to user (not a transfer, just a state change)
    moveItemToUser = async (req, res) => {
        try {
            console.log('Received warehouse move data:', req.body); // Debug log
            
            const { productId, targetUserSymbol, productDetails } = req.body;
            
            if (!productId || !targetUserSymbol) {
                return res.status(400).json({ 
                    error: 'Product ID and target user symbol are required' 
                });
            }

            // Find the target user by symbol
            const targetUser = await User.findOne({ symbol: targetUserSymbol });
            if (!targetUser) {
                return res.status(404).json({ 
                    error: `User with symbol ${targetUserSymbol} not found` 
                });
            }

            // Find the item in warehouse (state)
            const warehouseItem = await State.findById(productId);
            if (!warehouseItem) {
                return res.status(404).json({ 
                    error: 'Product not found in warehouse' 
                });
            }

            // Update the item's location to the target user
            warehouseItem.sellingPoint = targetUser._id;
            await warehouseItem.save();

            // Create history entry
            const historyEntry = new History({
                collectionName: 'Stan',
                operation: 'Przeniesienie magazynowe',
                product: `${productDetails?.fullName || 'Nieznany produkt'} ${productDetails?.size || 'Nieznany rozmiar'}`,
                details: `Przeniesiono produkt z magazynu do ${targetUserSymbol}`,
                userloggedinId: req.user ? req.user._id : null,
                from: 'Magazyn',
                to: targetUserSymbol
            });

            await historyEntry.save();
            console.log('Warehouse move completed successfully'); // Debug log

            res.status(200).json({
                message: 'Product moved successfully',
                item: warehouseItem
            });

        } catch (error) {
            console.log('Warehouse move error:', error); // Debug log
            res.status(500).json({ error: error.message });
        }
    };

    // Add item to warehouse (create new state with MAGAZYN user)
    addToWarehouse = async (req, res) => {
        try {
            console.log('Adding item to warehouse:', req.body);
            
            const { goodsId, sizeId, price, discount_price, barcode } = req.body;
            
            if (!goodsId || !price || !barcode) {
                return res.status(400).json({ 
                    error: 'Goods ID, price and barcode are required' 
                });
            }

            // Find MAGAZYN user
            const magazynUser = await User.findOne({ symbol: 'MAGAZYN' });
            if (!magazynUser) {
                return res.status(404).json({ error: 'MAGAZYN user not found' });
            }

            // Create new state entry for warehouse (State model, not Warehouse)
            const warehouseItem = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: goodsId, // goodsId should be ObjectId referring to Goods
                date: new Date(),
                barcode: barcode,
                size: sizeId || null, // Size is optional (null for bags)
                sellingPoint: magazynUser._id,
                price: price,
                discount_price: discount_price || null
            });

            await warehouseItem.save();

            res.status(201).json({
                message: 'Item added to warehouse successfully',
                item: warehouseItem
            });

        } catch (error) {
            console.error('Error adding item to warehouse:', error);
            res.status(500).json({ error: error.message });
        }
    };

    // Generate warehouse report
    generateReport = async (req, res) => {
        try {
            const { startDate, endDate, productFilter, productId, category, manufacturerId, sizeId } = req.query;
            
            console.log(`📋 WAREHOUSE REPORT REQUEST:`, { startDate, endDate, productFilter, productId, category, manufacturerId, sizeId });
            console.log(`🔍 Checking filter conditions:`);
            console.log(`  - productFilter === 'size': ${productFilter === 'size'}`);
            console.log(`  - productFilter === 'specific': ${productFilter === 'specific'}`);
            console.log(`  - productFilter === 'category': ${productFilter === 'category'}`);
            console.log(`  - productFilter === 'manufacturer': ${productFilter === 'manufacturer'}`);
            console.log(`  - sizeId present: ${!!sizeId}`);
            
            if (!startDate || !endDate) {
                return res.status(400).json({ 
                    error: 'Start date and end date are required' 
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date

            // Find MAGAZYN user
            const magazynUser = await User.findOne({ symbol: 'MAGAZYN' });
            if (!magazynUser) {
                return res.status(404).json({ error: 'MAGAZYN user not found' });
            }

            // Build query for history operations
            let historyQuery = {
                timestamp: { $gte: start, $lte: end },
                $or: [
                    { operation: 'Dodano do stanu (z magazynu)' }, // Transfer from warehouse
                    { operation: 'Przeniesienie magazynowe' }, // Warehouse movement
                    { operation: 'Dodano do magazynu' }, // Added to warehouse (zatowarowanie)
                    { operation: 'Usunięto z magazynu' }, // Removed from warehouse
                    { operation: 'Dodano do stanu' } // General state addition (could be to warehouse)
                ]
            };

            // If specific product is selected, filter by product name
            if (productFilter === 'specific' && productId) {
                const mongoose = require('mongoose');
                const Goods = require('../db/models/goods');
                
                const product = await Goods.findById(productId);
                if (product) {
                    historyQuery.product = { $regex: product.fullName, $options: 'i' };
                }
            }

            // If category is selected, filter by product category
            if (productFilter === 'category' && category) {
                console.log(`🔍 Filtering by category: ${category}`);
                const Goods = require('../db/models/goods');
                
                let productsInCategory = [];
                
                if (category === 'Paski') {
                    // Filter products from "Pozostały asortyment" category with subcategory "belts"
                    productsInCategory = await Goods.find({ 
                        category: 'Pozostały asortyment',
                        subcategory: 'belts'
                    }).select('_id fullName');
                    console.log(`📦 Found ${productsInCategory.length} products in Paski category`);
                    if (productsInCategory.length > 0) {
                        console.log(`📝 Paski products found:`, productsInCategory.map(p => p.fullName));
                    }
                } else if (category === 'Rękawiczki') {
                    // Filter products from "Pozostały asortyment" category with subcategory "gloves"
                    productsInCategory = await Goods.find({ 
                        category: 'Pozostały asortyment',
                        subcategory: 'gloves'
                    }).select('_id fullName');
                    console.log(`📦 Found ${productsInCategory.length} products in Rękawiczki category`);
                } else if (category === 'Portfele') {
                    // Filter products from "Portfele" category
                    productsInCategory = await Goods.find({ 
                        category: 'Portfele'
                    }).select('_id fullName');
                    console.log(`📦 Found ${productsInCategory.length} products in Portfele category`);
                } else {
                    // Get all products from selected category
                    productsInCategory = await Goods.find({ category: category }).select('fullName');
                    console.log(`📦 Found ${productsInCategory.length} products in ${category} category`);
                }
                
                if (productsInCategory.length > 0) {
                    const productNames = productsInCategory.map(p => p.fullName);
                    console.log(`🔎 Looking for products in history:`, productNames.slice(0, 5));
                    
                    // Use regex to match product names with possible suffixes (sizes, symbols, etc.)
                    if (productNames.length === 1) {
                        // For single product, use regex to match with optional suffix
                        const escapedName = productNames[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regexPattern = `^${escapedName}(\\s+.*)?$`;
                        historyQuery.product = { $regex: regexPattern, $options: 'i' };
                        console.log(`🔍 Using regex pattern: ${regexPattern}`);
                    } else {
                        // For multiple products, use $or with regex patterns
                        historyQuery.$and = historyQuery.$and || [];
                        historyQuery.$and.push({
                            $or: productNames.map(name => {
                                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                return { product: { $regex: `^${escapedName}(\\s+.*)?$`, $options: 'i' } };
                            })
                        });
                        delete historyQuery.product; // Remove the product field since we're using $or
                    }
                    
                    // Store productNames for debugging later
                    historyQuery._debugProductNames = productNames;
                } else {
                    console.log(`⚠️ No products found in category ${category}`);
                }
            }

            // If combined filter is used (category AND manufacturer)
            if (productFilter === 'combined' && (category || manufacturerId)) {
                console.log(`🔍🏭 Combined filtering - Category: ${category}, Manufacturer: ${manufacturerId}`);
                const Goods = require('../db/models/goods');
                
                let query = {};
                
                // Build query for category
                if (category) {
                    if (category === 'Paski') {
                        query.category = 'Pozostały asortyment';
                        query.subcategory = 'belts';
                    } else if (category === 'Rękawiczki') {
                        query.category = 'Pozostały asortyment';
                        query.subcategory = 'gloves';
                    } else {
                        query.category = category;
                    }
                }
                
                // Add manufacturer filter
                if (manufacturerId) {
                    query.manufacturer = manufacturerId;
                }
                
                const combinedProducts = await Goods.find(query).select('_id fullName');
                console.log(`📦 Found ${combinedProducts.length} products matching combined filters`);
                
                if (combinedProducts.length > 0) {
                    const productNames = combinedProducts.map(p => p.fullName);
                    console.log(`🔎 Looking for combined products in history:`, productNames.slice(0, 5));
                    
                    // Use regex to match product names with possible suffixes
                    if (productNames.length === 1) {
                        const escapedName = productNames[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regexPattern = `^${escapedName}(\\s+.*)?$`;
                        historyQuery.product = { $regex: regexPattern, $options: 'i' };
                        console.log(`🔍 Using combined regex pattern: ${regexPattern}`);
                    } else {
                        historyQuery.$and = historyQuery.$and || [];
                        historyQuery.$and.push({
                            $or: productNames.map(name => {
                                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                return { product: { $regex: `^${escapedName}(\\s+.*)?$`, $options: 'i' } };
                            })
                        });
                        delete historyQuery.product;
                    }
                    
                    historyQuery._debugCombinedProducts = productNames;
                } else {
                    console.log(`⚠️ No products found matching combined filters`);
                }
            }

            // If manufacturer is selected, filter by manufacturer
            if (productFilter === 'manufacturer' && manufacturerId) {
                console.log(`🏭 Filtering by manufacturer ID: ${manufacturerId}`);
                const Goods = require('../db/models/goods');
                
                // Find all products from selected manufacturer
                const productsFromManufacturer = await Goods.find({ 
                    manufacturer: manufacturerId 
                }).select('_id fullName');
                
                console.log(`📦 Found ${productsFromManufacturer.length} products from manufacturer`);
                
                if (productsFromManufacturer.length > 0) {
                    const productNames = productsFromManufacturer.map(p => p.fullName);
                    console.log(`🔎 Looking for manufacturer products in history:`, productNames.slice(0, 5));
                    
                    // Use regex to match product names with possible suffixes (sizes, symbols, etc.)
                    if (productNames.length === 1) {
                        // For single product, use regex to match with optional suffix
                        const escapedName = productNames[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regexPattern = `^${escapedName}(\\s+.*)?$`;
                        historyQuery.product = { $regex: regexPattern, $options: 'i' };
                        console.log(`🔍 Using regex pattern for manufacturer: ${regexPattern}`);
                    } else {
                        // For multiple products, use $or with regex patterns
                        historyQuery.$and = historyQuery.$and || [];
                        historyQuery.$and.push({
                            $or: productNames.map(name => {
                                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                return { product: { $regex: `^${escapedName}(\\s+.*)?$`, $options: 'i' } };
                            })
                        });
                        delete historyQuery.product; // Remove the product field since we're using $or
                    }
                    
                    // Store productNames for debugging
                    historyQuery._debugManufacturerProducts = productNames;
                } else {
                    console.log(`⚠️ No products found from manufacturer ${manufacturerId}`);
                }
            }

            // If size filter is used
            if (productFilter === 'size' && sizeId) {
                console.log(`📐 Filtering by size ID: ${sizeId}`);
                const Size = require('../db/models/size');
                
                // Find size name for logging
                const size = await Size.findById(sizeId);
                console.log(`📐 Size found: ${size ? size.Roz_Opis : 'Unknown'}`);
                
                if (size && size.Roz_Opis) {
                    // Direct approach: search in history for products containing the size
                    console.log(`🔍 Direct size filtering - Looking for products ending with size: ${size.Roz_Opis}`);
                    
                    historyQuery.$and = historyQuery.$and || [];
                    historyQuery.$and.push({
                        product: { $regex: `\\s${size.Roz_Opis}(\\s|$)`, $options: 'i' }
                    });
                    
                    console.log(`🔍 Applied size filter regex: \\s${size.Roz_Opis}(\\s|$)`);
                } else {
                    console.log(`⚠️ Size not found for ID: ${sizeId}`);
                }
            }

            // If category + size filter is used
            if (productFilter === 'category_size' && (category && sizeId)) {
                console.log(`🔍📐 Category + Size filtering - Category: ${category}, Size: ${sizeId}`);
                const Goods = require('../db/models/goods');
                const Size = require('../db/models/size');
                
                const size = await Size.findById(sizeId);
                console.log(`📐 Size found: ${size ? size.Roz_Opis : 'Unknown'}`);
                
                let query = { sizes: sizeId };
                
                // Build query for category
                if (category === 'Paski') {
                    query.category = 'Pozostały asortyment';
                    query.subcategory = 'belts';
                } else if (category === 'Rękawiczki') {
                    query.category = 'Pozostały asortyment';
                    query.subcategory = 'gloves';
                } else {
                    query.category = category;
                }
                
                const categoryProducts = await Goods.find(query).select('_id fullName');
                console.log(`📦 Found ${categoryProducts.length} products in category ${category} with size ${size ? size.Roz_Opis : sizeId}`);
                
                if (categoryProducts.length > 0) {
                    const productNames = categoryProducts.map(p => p.fullName);
                    console.log(`🔎 Looking for category+size products in history:`, productNames.slice(0, 5));
                    
                    historyQuery.$and = historyQuery.$and || [];
                    historyQuery.$and.push({
                        $and: [
                            { 
                                $or: productNames.map(name => {
                                    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    return { product: { $regex: `^${escapedName}`, $options: 'i' } };
                                })
                            },
                            { 
                                product: { $regex: `\\s+${size ? size.Roz_Opis : ''}(\\s|$)`, $options: 'i' } 
                            }
                        ]
                    });
                    
                    historyQuery._debugCategorySizeProducts = productNames;
                } else {
                    console.log(`⚠️ No products found in category ${category} with size ${size ? size.Roz_Opis : sizeId}`);
                }
            }

            // If manufacturer + size filter is used
            if (productFilter === 'manufacturer_size' && (manufacturerId && sizeId)) {
                console.log(`🏭📐 Manufacturer + Size filtering - Manufacturer: ${manufacturerId}, Size: ${sizeId}`);
                const Goods = require('../db/models/goods');
                const Size = require('../db/models/size');
                
                const size = await Size.findById(sizeId);
                console.log(`📐 Size found: ${size ? size.Roz_Opis : 'Unknown'}`);
                
                const manufacturerSizeProducts = await Goods.find({ 
                    manufacturer: manufacturerId,
                    sizes: sizeId 
                }).select('_id fullName');
                
                console.log(`📦 Found ${manufacturerSizeProducts.length} products from manufacturer with size ${size ? size.Roz_Opis : sizeId}`);
                
                if (manufacturerSizeProducts.length > 0) {
                    const productNames = manufacturerSizeProducts.map(p => p.fullName);
                    console.log(`🔎 Looking for manufacturer+size products in history:`, productNames.slice(0, 5));
                    
                    historyQuery.$and = historyQuery.$and || [];
                    historyQuery.$and.push({
                        $and: [
                            { 
                                $or: productNames.map(name => {
                                    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    return { product: { $regex: `^${escapedName}`, $options: 'i' } };
                                })
                            },
                            { 
                                product: { $regex: `\\s+${size ? size.Roz_Opis : ''}(\\s|$)`, $options: 'i' } 
                            }
                        ]
                    });
                    
                    historyQuery._debugManufacturerSizeProducts = productNames;
                } else {
                    console.log(`⚠️ No products found from manufacturer with size ${size ? size.Roz_Opis : sizeId}`);
                }
            }

            // If combined all filter is used (category + manufacturer + size)
            if (productFilter === 'combined_all' && (category || manufacturerId || sizeId)) {
                console.log(`🔍🏭📐 Combined ALL filtering - Category: ${category}, Manufacturer: ${manufacturerId}, Size: ${sizeId}`);
                const Goods = require('../db/models/goods');
                const Size = require('../db/models/size');
                
                let query = {};
                
                // Build query for category
                if (category) {
                    if (category === 'Paski') {
                        query.category = 'Pozostały asortyment';
                        query.subcategory = 'belts';
                    } else if (category === 'Rękawiczki') {
                        query.category = 'Pozostały asortyment';
                        query.subcategory = 'gloves';
                    } else {
                        query.category = category;
                    }
                }
                
                // Add manufacturer filter
                if (manufacturerId) {
                    query.manufacturer = manufacturerId;
                }
                
                // Add size filter
                if (sizeId) {
                    query.sizes = sizeId;
                }
                
                const size = sizeId ? await Size.findById(sizeId) : null;
                
                const combinedAllProducts = await Goods.find(query).select('_id fullName');
                console.log(`📦 Found ${combinedAllProducts.length} products matching all combined filters`);
                
                if (combinedAllProducts.length > 0) {
                    const productNames = combinedAllProducts.map(p => p.fullName);
                    console.log(`🔎 Looking for combined all products in history:`, productNames.slice(0, 5));
                    
                    historyQuery.$and = historyQuery.$and || [];
                    if (size) {
                        historyQuery.$and.push({
                            $and: [
                                { 
                                    $or: productNames.map(name => {
                                        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        return { product: { $regex: `^${escapedName}`, $options: 'i' } };
                                    })
                                },
                                { 
                                    product: { $regex: `\\s+${size.Roz_Opis}(\\s|$)`, $options: 'i' } 
                                }
                            ]
                        });
                    } else {
                        historyQuery.$and.push({
                            $or: productNames.map(name => {
                                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                return { product: { $regex: `^${escapedName}(\\s+.*)?$`, $options: 'i' } };
                            })
                        });
                    }
                    
                    historyQuery._debugCombinedAllProducts = productNames;
                } else {
                    console.log(`⚠️ No products found matching all combined filters`);
                }
            }

            // Apply universal size filter (works with any product filter above)
            if (sizeId && productFilter !== 'size' && productFilter !== 'category_size' && productFilter !== 'manufacturer_size' && productFilter !== 'combined_all') {
                console.log(`📐 MOVEMENTS: Adding universal size filter - ${sizeId}`);
                const Size = require('../db/models/size');
                
                const size = await Size.findById(sizeId);
                if (size && size.Roz_Opis) {
                    console.log(`📐 MOVEMENTS: Universal size filtering for: ${size.Roz_Opis}`);
                    
                    historyQuery.$and = historyQuery.$and || [];
                    historyQuery.$and.push({
                        product: { $regex: `\\s${size.Roz_Opis}(\\s|$)`, $options: 'i' }
                    });
                    
                    console.log(`📐 MOVEMENTS: Applied universal size filter regex: \\s${size.Roz_Opis}(\\s|$)`);
                }
            }

            // Get initial state (count at start date)
            let initialStateQuery = {
                sellingPoint: magazynUser._id,
                date: { $lt: start }
            };

            if (productFilter === 'specific' && productId) {
                // productId is already an ObjectId from frontend
                initialStateQuery.fullName = productId;
            }

            if (productFilter === 'category' && category) {
                const Goods = require('../db/models/goods');
                
                let productsInCategory = [];
                
                if (category === 'Paski') {
                    // Filter products from "Pozostały asortyment" category with subcategory "belts"
                    productsInCategory = await Goods.find({ 
                        category: 'Pozostały asortyment',
                        subcategory: 'belts'
                    }).select('_id fullName');
                } else if (category === 'Rękawiczki') {
                    // Filter products from "Pozostały asortyment" category with subcategory "gloves"
                    productsInCategory = await Goods.find({ 
                        category: 'Pozostały asortyment',
                        subcategory: 'gloves'
                    }).select('_id fullName');
                } else if (category === 'Portfele') {
                    // Filter products from "Portfele" category for state query
                    productsInCategory = await Goods.find({ 
                        category: 'Portfele'
                    }).select('_id fullName');
                } else {
                    // Get all products from selected category for state query
                    productsInCategory = await Goods.find({ category: category }).select('_id fullName');
                }
                
                if (productsInCategory.length > 0) {
                    // Use product IDs for State query (fullName field in State is ObjectId reference to Goods)
                    const productIds = productsInCategory.map(p => p._id);
                    initialStateQuery.fullName = { $in: productIds };
                    console.log(`🆔 Using product IDs for State query:`, productIds.slice(0, 3));
                }
            }

            if (productFilter === 'combined' && (category || manufacturerId)) {
                const Goods = require('../db/models/goods');
                
                let query = {};
                
                // Build query for category
                if (category) {
                    if (category === 'Paski') {
                        query.category = 'Pozostały asortyment';
                        query.subcategory = 'belts';
                    } else if (category === 'Rękawiczki') {
                        query.category = 'Pozostały asortyment';
                        query.subcategory = 'gloves';
                    } else {
                        query.category = category;
                    }
                }
                
                // Add manufacturer filter
                if (manufacturerId) {
                    query.manufacturer = manufacturerId;
                }
                
                const combinedProducts = await Goods.find(query).select('_id fullName');
                
                if (combinedProducts.length > 0) {
                    const productIds = combinedProducts.map(p => p._id);
                    initialStateQuery.fullName = { $in: productIds };
                    console.log(`🏭🆔 Using combined product IDs for State query:`, productIds.slice(0, 3));
                }
            }

            if (productFilter === 'manufacturer' && manufacturerId) {
                const Goods = require('../db/models/goods');
                
                // Find all products from selected manufacturer for state query
                const productsFromManufacturer = await Goods.find({ 
                    manufacturer: manufacturerId 
                }).select('_id fullName');
                
                if (productsFromManufacturer.length > 0) {
                    // Use product IDs for State query (fullName field in State is ObjectId reference to Goods)
                    const productIds = productsFromManufacturer.map(p => p._id);
                    initialStateQuery.fullName = { $in: productIds };
                    console.log(`🏭🆔 Using manufacturer product IDs for State query:`, productIds.slice(0, 3));
                }
            }

            const initialStateCount = await State.countDocuments(initialStateQuery);

            // Get operations within date range
            // Remove debug fields before query
            delete historyQuery._debugProductNames;
            delete historyQuery._debugManufacturerProducts;
            delete historyQuery._debugCombinedProducts;
            console.log(`📋 History query:`, historyQuery);
            const operations = await History.find(historyQuery)
                .sort({ timestamp: 1 })
                .lean();
            
            console.log(`📊 Found ${operations.length} operations in history`);
            
            // Debug: Show what operations we found
            if (operations.length > 0) {
                console.log(`🔍 Operations found:`, operations.map(op => `"${op.operation}" - "${op.product}"`));
            } else {
                console.log(`🔍 No operations found. Let's check what's in history for debugging...`);
                // Check if there are any operations for this product in the date range
                const debugProductNames = historyQuery._debugProductNames || ['Adela KAKAO'];
                const debugOps = await History.find({
                    timestamp: { $gte: start, $lte: end },
                    product: { $in: debugProductNames }
                }).select('operation product timestamp').lean();
                console.log(`🐛 Debug - Found ${debugOps.length} operations for our products:`, 
                    debugOps.map(op => `"${op.operation}" - "${op.product}" - ${op.timestamp}`));
                    
                // Also check what operations exist in general for the date range
                const allOpsInRange = await History.find({
                    timestamp: { $gte: start, $lte: end }
                }).select('operation product').lean();
                console.log(`🐛 All operations in date range (${allOpsInRange.length}):`, 
                    allOpsInRange.slice(0, 5).map(op => `"${op.operation}" - "${op.product}"`));
            }

            // Process operations into report format
            const reportOperations = [];
            let totalAdded = 0;
            let totalSubtracted = 0;

            for (let operation of operations) {
                let reportItem = {
                    date: operation.timestamp,
                    type: '',
                    add: 0,
                    subtract: 0,
                    product: operation.product
                };

                switch (operation.operation) {
                    case 'Dodano do stanu (z magazynu)':
                        // Transfer from warehouse to point (subtract from warehouse)
                        let details = {};
                        try {
                            details = JSON.parse(operation.details || '{}');
                        } catch (e) {
                            details = {};
                        }
                        const targetPoint = details.sellingPointSymbol || 'Nieznany punkt';
                        reportItem.type = `Transfer do ${targetPoint}`;
                        reportItem.subtract = 1;
                        totalSubtracted += 1;
                        break;
                        
                    case 'Dodano do magazynu':
                        // Added to warehouse (zatowarowanie)
                        reportItem.type = 'Zatowarowanie';
                        reportItem.add = 1;
                        totalAdded += 1;
                        break;

                    case 'Dodano do stanu':
                        // Check if it's added to MAGAZYN user or if operation is about warehouse
                        let stateDetails = {};
                        try {
                            stateDetails = JSON.parse(operation.details || '{}');
                        } catch (e) {
                            stateDetails = {};
                        }
                        
                        // Check if target is MAGAZYN or if the operation text contains warehouse info
                        if (stateDetails.sellingPointSymbol === 'MAGAZYN' || 
                            operation.to === 'MAGAZYN' ||
                            (operation.details && operation.details.includes('MAGAZYN'))) {
                            reportItem.type = 'Zatowarowanie';
                            reportItem.add = 1;
                            totalAdded += 1;
                        }
                        break;
                        
                    case 'Usunięto z magazynu':
                        // Removed from warehouse
                        reportItem.type = 'Usunięto z magazynu';
                        reportItem.subtract = 1;
                        totalSubtracted += 1;
                        break;
                        
                    case 'Przeniesienie magazynowe':
                        // Warehouse movement
                        if (operation.from === 'Magazyn') {
                            reportItem.type = `Transfer do ${operation.to}`;
                            reportItem.subtract = 1;
                            totalSubtracted += 1;
                        } else if (operation.to === 'Magazyn') {
                            reportItem.type = `Zwrot z ${operation.from}`;
                            reportItem.add = 1;
                            totalAdded += 1;
                        }
                        break;
                }

                if (reportItem.type) {
                    reportOperations.push(reportItem);
                }
            }

            // Calculate final state
            const balance = totalAdded - totalSubtracted;
            const finalState = initialStateCount + balance;

            const reportData = {
                initialState: {
                    date: start,
                    quantity: initialStateCount
                },
                operations: reportOperations,
                summary: {
                    totalAdded,
                    totalSubtracted,
                    balance,
                    finalState,
                    startDate: start,
                    endDate: end
                }
            };

            res.status(200).json(reportData);

        } catch (error) {
            console.error('Error generating warehouse report:', error);
            res.status(500).json({ error: error.message });
        }
    };

    // Generate inventory report (state on specific date)
    generateInventoryReport = async (req, res) => {
        try {
            const { date, productFilter, productId, category, manufacturerId, sizeId } = req.query;
            
            if (!date) {
                return res.status(400).json({ 
                    error: 'Date is required for inventory report' 
                });
            }

            const targetDate = new Date(date);
            targetDate.setHours(23, 59, 59, 999); // Include the entire target date

            // Find MAGAZYN user
            const magazynUser = await User.findOne({ symbol: 'MAGAZYN' });
            if (!magazynUser) {
                return res.status(404).json({ error: 'MAGAZYN user not found' });
            }

            // Build query for current state (items in warehouse on target date)
            let stateQuery = {
                sellingPoint: magazynUser._id,
                date: { $lte: targetDate }
            };

            // Apply product filtering (now with size support)
            if (productFilter === 'specific' && productId) {
                stateQuery.fullName = productId;
                console.log(`📐 INVENTORY: Specific product filter - ${productId}`);
            } else if ((productFilter === 'category' || productFilter === 'combined') && category) {
                const Goods = require('../db/models/goods');
                
                let productsQuery = {};
                
                if (category === 'Paski') {
                    productsQuery = { 
                        category: 'Pozostały asortyment',
                        subcategory: 'belts'
                    };
                } else if (category === 'Rękawiczki') {
                    productsQuery = { 
                        category: 'Pozostały asortyment',
                        subcategory: 'gloves'
                    };
                } else {
                    productsQuery.category = category;
                }
                
                if ((productFilter === 'manufacturer' || productFilter === 'combined') && manufacturerId) {
                    productsQuery.manufacturer = manufacturerId;
                }
                
                const filteredProducts = await Goods.find(productsQuery).select('_id');
                
                if (filteredProducts.length > 0) {
                    const productIds = filteredProducts.map(p => p._id);
                    stateQuery.fullName = { $in: productIds };
                    console.log(`📐 INVENTORY: Category/combined filter - ${productIds.length} products`);
                } else {
                    console.log(`📐 INVENTORY: No products found for category/combined filter`);
                    return res.status(200).json({
                        items: [],
                        totalItems: 0,
                        date: targetDate
                    });
                }
            } else if (productFilter === 'manufacturer' && manufacturerId) {
                const Goods = require('../db/models/goods');
                
                const productsFromManufacturer = await Goods.find({ 
                    manufacturer: manufacturerId 
                }).select('_id');
                
                if (productsFromManufacturer.length > 0) {
                    const productIds = productsFromManufacturer.map(p => p._id);
                    stateQuery.fullName = { $in: productIds };
                    console.log(`📐 INVENTORY: Manufacturer filter - ${productIds.length} products`);
                } else {
                    console.log(`📐 INVENTORY: No products found for manufacturer filter`);
                    return res.status(200).json({
                        items: [],
                        totalItems: 0,
                        date: targetDate
                    });
                }
            }

            // Apply size filter (works with any of the above product filters)
            if (sizeId) {
                console.log(`📐 INVENTORY: Adding size filter - ${sizeId}`);
                stateQuery.size = sizeId;
            }



            console.log(`📦 Inventory query for ${date}:`, stateQuery);

            // Get all items in warehouse on target date
            const inventoryItems = await State.find(stateQuery)
                .populate('fullName', 'fullName category manufacturer')
                .populate('size', 'Roz_Opis')
                .sort({ date: -1 })
                .lean();

            console.log(`📦 Found ${inventoryItems.length} items in inventory`);

            // Format items for response
            const formattedItems = inventoryItems.map(item => ({
                productName: item.fullName?.fullName || 'Nieznany produkt',
                category: item.fullName?.category || 'Brak kategorii',
                manufacturer: item.fullName?.manufacturer || null,
                size: item.size?.Roz_Opis || '-',
                barcode: item.barcode || '-',
                price: item.price || 0,
                date: item.date
            }));

            // Create summary grouped by product name and size
            console.log(`📊 SUMMARY DEBUG: Processing ${formattedItems.length} items for summary`);
            console.log(`📊 First 5 items:`, formattedItems.slice(0, 5).map(item => ({ 
                productName: item.productName, 
                size: item.size, 
                barcode: item.barcode 
            })));
            
            const summary = {};
            formattedItems.forEach((item, index) => {
                // Group by product name AND size (current behavior)
                const key = `${item.productName} ${item.size !== '-' ? item.size : ''}`.trim();
                
                // If you want to group only by product name (ignoring size), use this instead:
                // const key = item.productName;
                
                if (!summary[key]) {
                    summary[key] = {
                        productName: item.productName,
                        size: item.size,
                        category: item.category,
                        manufacturer: item.manufacturer,
                        count: 0,
                        totalValue: 0
                    };
                    console.log(`📊 NEW GROUP: Created group "${key}"`);
                }
                
                summary[key].count += 1;
                summary[key].totalValue += item.price || 0;
                
                console.log(`📊 ITEM ${index + 1}: "${key}" -> count: ${summary[key].count}, price: ${item.price}`);
            });

            // Convert summary object to array and sort by product name
            const summaryArray = Object.entries(summary).map(([key, data]) => ({
                productKey: key,
                productName: data.productName,
                size: data.size,
                category: data.category,
                manufacturer: data.manufacturer,
                count: data.count,
                totalValue: data.totalValue,
                averagePrice: data.count > 0 ? (data.totalValue / data.count).toFixed(2) : 0
            })).sort((a, b) => a.productName.localeCompare(b.productName));

            console.log(`📊 Generated summary for ${summaryArray.length} unique product variants`);

            const inventoryData = {
                items: formattedItems,
                summary: summaryArray,
                totalItems: formattedItems.length,
                totalUniqueProducts: summaryArray.length,
                date: targetDate
            };

            res.status(200).json(inventoryData);

        } catch (error) {
            console.error('Error generating inventory report:', error);
            res.status(500).json({ error: error.message });
        }
    };
}

module.exports = new WarehouseController();
