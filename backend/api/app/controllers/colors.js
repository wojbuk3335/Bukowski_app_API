const Color = require('../db/models/color');
const mongoose = require('mongoose');
const config = require('../config');
const axios = require('axios');

class ColorsController {
    getAllColors(req, res, next) {
        Color.find()
            .select('_id Kol_Kod Kol_Opis')
            .then(colors => {
                const response = {
                    count: colors.length,
                    colors: colors.map(color => {
                        return {
                            _id: color._id,
                            Kol_Kod: color.Kol_Kod,
                            Kol_Opis: color.Kol_Opis,
                            request: {
                                type: 'GET',
                                url: `${config.domain}/api/excel/color/${color._id}`
                            }
                        };
                    })
                };
                res.status(200).json(response);
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    insertManyColors(req, res, next) {
        const colors = req.body;
    
        // Check for duplicate Kol_Kod values and convert Kol_Opis to uppercase
        const kolKodSet = new Set();
        for (const color of colors) {
            if (kolKodSet.has(color.Kol_Kod)) {
                return res.status(400).json({
                    error: {
                        message: 'Duplicate Kol_Kod values in request body'
                    }
                });
            }
            kolKodSet.add(color.Kol_Kod);
            
            // Convert color name to uppercase
            if (color.Kol_Opis && typeof color.Kol_Opis === 'string') {
                color.Kol_Opis = color.Kol_Opis.toUpperCase();
                console.log(`🔤 Converting color name to uppercase: "${color.Kol_Opis}"`);
            }
        }
    
        // Proceed to insert the colors - use option to get back full documents
        Color.insertMany(colors, { returnDocument: 'after' })
            .then(async (result) => {
                // If _id is missing in test environment, fetch the documents by Kol_Kod
                let colorsWithId = result;
                if (!result[0] || !result[0]._id) {
                    const kolKods = colors.map(c => c.Kol_Kod);
                    colorsWithId = await Color.find({ Kol_Kod: { $in: kolKods } }).lean();
                }
                
                res.status(201).json({
                    message: 'Colors inserted',
                    colors: colorsWithId
                });
            })
            .catch(err => {
                if (err.code === 11000) { // Duplicate key error
                    res.status(400).json({
                        error: {
                            message: 'Duplicate Kol_Kod values'
                        }
                    });
                } else {
                    res.status(500).json({
                        error: {
                            message: err.message
                        }
                    });
                }
            });
    }

    deleteAllColors(req, res, next) {
        Color.deleteMany()
            .then(result => {
                res.status(200).json({
                    message: 'All colors deleted'
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    getColorById(req, res, next) {
        const id = req.params.colorId;
        Color.findById(id)
            .select('_id Kol_Kod Kol_Opis')
            .then(color => {
                if (color) {
                    res.status(200).json({
                        color: color,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/color/get-all-colors`
                        }
                    });
                } else {
                    res.status(404).json({
                        error: {
                            message: 'Color not found'
                        }
                    });
                }
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }

    async updateColorById(req, res, next) {
        const id = req.params.colorId;
        const updateOps = {};
        
        // Get old color data before updating
        let oldColor = null;
        try {
            oldColor = await Color.findById(id);
        } catch (err) {
            return res.status(500).json({
                error: { message: err.message }
            });
        }

        if (!oldColor) {
            return res.status(404).json({
                error: { message: 'Color not found' }
            });
        }

        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                // Convert color name to uppercase if it's Kol_Opis
                if (key === 'Kol_Opis' && typeof req.body[key] === 'string') {
                    updateOps[key] = req.body[key].toUpperCase();
                    console.log(`🔤 Converting color name to uppercase: "${req.body[key]}" → "${updateOps[key]}"`);
                } else {
                    updateOps[key] = req.body[key];
                }
            }
        }

        Color.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(async (result) => {
                // Check if Kol_Opis (color name) was changed and sync product names
                if (updateOps.Kol_Opis && oldColor.Kol_Opis !== updateOps.Kol_Opis) {
                    console.log('🔄 Color name changed, syncing product names...');
                    console.log(`Old name: "${oldColor.Kol_Opis}" → New name: "${updateOps.Kol_Opis}"`);

                    try {
                        // Direct sync instead of HTTP call to avoid routing issues
                        console.log('🔄 Direct sync: Updating product names with color change');
                        console.log(`Old color: "${oldColor.Kol_Opis}" → New color: "${updateOps.Kol_Opis}"`);
                        
                        const Goods = require('../db/models/goods');
                        
                        // Find all goods that use this color
                        const goods = await Goods.find({ color: oldColor._id });
                        console.log(`🔍 Found ${goods.length} products using this color`);
                        
                        // Update each product's fullName
                        let updatedCount = 0;
                        for (const good of goods) {
                            const oldFullName = good.fullName;
                            // Use regex to replace the old color name with new one
                            const newFullName = good.fullName.replace(
                                new RegExp(oldColor.Kol_Opis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                                updateOps.Kol_Opis
                            );
                            
                            if (oldFullName !== newFullName) {
                                await Goods.updateOne(
                                    { _id: good._id },
                                    { $set: { fullName: newFullName } }
                                );
                                
                                console.log(`✅ Updated product: "${oldFullName}" → "${newFullName}"`);
                                updatedCount++;
                            }
                        }
                        
                        console.log(`✅ Product names synchronized directly. Updated: ${updatedCount} products`);
                        
                        // Now synchronize price lists with updated product names
                        if (updatedCount > 0) {
                            try {
                                console.log('🔄 Synchronizing price lists after color name change...');
                                
                                const PriceList = require('../db/models/priceList');
                                
                                // Find all price lists
                                const priceLists = await PriceList.find({});
                                console.log(`🔍 Found ${priceLists.length} price lists to update`);
                                
                                let totalPriceListUpdates = 0;
                                
                                for (const priceList of priceLists) {
                                    let hasChanges = false;
                                    
                                    // Update fullName in price list items that match the updated goods
                                    for (const item of priceList.items) {
                                        // Check if this price list item corresponds to one of the updated goods
                                        const updatedGood = goods.find(g => g._id.toString() === item.originalGoodId.toString());
                                        if (updatedGood) {
                                            const oldPriceListName = item.fullName;
                                            const newPriceListName = item.fullName.replace(
                                                new RegExp(oldColor.Kol_Opis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                                                updateOps.Kol_Opis
                                            );
                                            
                                            if (oldPriceListName !== newPriceListName) {
                                                item.fullName = newPriceListName;
                                                hasChanges = true;
                                                totalPriceListUpdates++;
                                                console.log(`📋 Updated price list item: "${oldPriceListName}" → "${newPriceListName}"`);
                                            }
                                        }
                                    }
                                    
                                    // Save price list if changes were made
                                    if (hasChanges) {
                                        await priceList.save();
                                    }
                                }
                                
                                console.log(`✅ Price lists synchronized. Updated: ${totalPriceListUpdates} price list items`);
                                
                            } catch (priceListError) {
                                console.error('❌ Error synchronizing price lists after color update:', priceListError.message);
                                console.error('Stack trace:', priceListError.stack);
                            }
                        }
                    } catch (syncError) {
                        console.error('❌ Error synchronizing product names after color update:', syncError.message);
                        console.error('Stack trace:', syncError.stack);
                        // Don't fail the color update if sync fails
                    }
                }

                res.status(200).json({
                    message: 'Color updated',
                    request: {
                        type: 'GET',
                        url: `${config.domain}/api/excel/color/${id}`
                    }
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: {
                        message: err.message
                    }
                });
            });
    }
}

module.exports = new ColorsController();