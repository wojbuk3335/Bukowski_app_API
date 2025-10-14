const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app/app');
const Color = require('../app/db/models/color');
const Goods = require('../app/db/models/goods');
const PriceList = require('../app/db/models/priceList');

describe('Colors - PriceList Synchronization', () => {
    let mongoServer;

    beforeAll(async () => {
        // Disconnect if already connected
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        await Color.deleteMany({});
        await Goods.deleteMany({});
        await PriceList.deleteMany({});
    });

    test('should update product names in price lists when color name is changed', async () => {
        // Create a color
        const colorData = {
            _id: new mongoose.Types.ObjectId(),
            Kol_Kod: 'BEŻOWY',
            Kol_Opis: 'BEŻOWY'
        };
        
        const color = new Color(colorData);
        await color.save();

        // Create a good that uses this color
        const goodData = {
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Kurtka BEŻOWY',
            code: 'KUR001',
            color: color._id,
            category: 'Kurtki kożuchy futra',
            price: 100
        };
        
        const good = new Goods(goodData);
        await good.save();

        // Create a price list with this good
        const priceListData = {
            sellingPointId: new mongoose.Types.ObjectId(),
            sellingPointName: 'Test Point',
            items: [{
                originalGoodId: good._id,
                fullName: 'Kurtka BEŻOWY',
                category: 'Kurtki kożuchy futra',
                price: 120
            }]
        };
        
        const priceList = new PriceList(priceListData);
        await priceList.save();

        // Update color name
        const response = await request(app)
            .patch(`/api/excel/color/update-color/${color._id}`)
            .send({
                Kol_Opis: 'KREMOWY'
            })
            .expect(200);

        // Check if good's fullName was updated
        const updatedGood = await Goods.findById(good._id);
        expect(updatedGood.fullName).toBe('Kurtka KREMOWY');

        // Check if price list item's fullName was updated
        const updatedPriceList = await PriceList.findById(priceList._id);
        expect(updatedPriceList.items[0].fullName).toBe('Kurtka KREMOWY');

        console.log('✅ Color name change synchronized to both Goods and PriceList');
    });

    test('should handle multiple products with same color in price lists', async () => {
        // Create a color
        const colorData = {
            _id: new mongoose.Types.ObjectId(),
            Kol_Kod: 'CZERWONY',
            Kol_Opis: 'CZERWONY'
        };
        
        const color = new Color(colorData);
        await color.save();

        // Create multiple goods that use this color
        const good1Data = {
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Kurtka CZERWONY',
            code: 'KUR002',
            color: color._id,
            category: 'Kurtki kożuchy futra',
            price: 100
        };
        
        const good2Data = {
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Płaszcz CZERWONY',
            code: 'PLA001',
            color: color._id,
            category: 'Kurtki kożuchy futra',
            price: 150
        };
        
        const good1 = new Goods(good1Data);
        const good2 = new Goods(good2Data);
        await good1.save();
        await good2.save();

        // Create a price list with both goods
        const priceListData = {
            sellingPointId: new mongoose.Types.ObjectId(),
            sellingPointName: 'Test Point',
            items: [
                {
                    originalGoodId: good1._id,
                    fullName: 'Kurtka CZERWONY',
                    category: 'Kurtki kożuchy futra',
                    price: 120
                },
                {
                    originalGoodId: good2._id,
                    fullName: 'Płaszcz CZERWONY',
                    category: 'Kurtki kożuchy futra',
                    price: 180
                }
            ]
        };
        
        const priceList = new PriceList(priceListData);
        await priceList.save();

        // Update color name
        const response = await request(app)
            .patch(`/api/excel/color/update-color/${color._id}`)
            .send({
                Kol_Opis: 'BORDOWY'
            })
            .expect(200);

        // Check if goods' fullNames were updated
        const updatedGood1 = await Goods.findById(good1._id);
        const updatedGood2 = await Goods.findById(good2._id);
        expect(updatedGood1.fullName).toBe('Kurtka BORDOWY');
        expect(updatedGood2.fullName).toBe('Płaszcz BORDOWY');

        // Check if price list items' fullNames were updated
        const updatedPriceList = await PriceList.findById(priceList._id);
        expect(updatedPriceList.items[0].fullName).toBe('Kurtka BORDOWY');
        expect(updatedPriceList.items[1].fullName).toBe('Płaszcz BORDOWY');

        console.log('✅ Multiple products color change synchronized to PriceList');
    });

    test('should handle color name with special characters', async () => {
        // Create a color with special characters
        const colorData = {
            _id: new mongoose.Types.ObjectId(),
            Kol_Kod: 'SPECIAL',
            Kol_Opis: 'BŁĘKITNY+ZŁOTY'
        };
        
        const color = new Color(colorData);
        await color.save();

        // Create a good that uses this color
        const goodData = {
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Sukienka BŁĘKITNY+ZŁOTY elegancka',
            code: 'SUK001',
            color: color._id,
            category: 'Sukienki',
            price: 200
        };
        
        const good = new Goods(goodData);
        await good.save();

        // Create a price list with this good
        const priceListData = {
            sellingPointId: new mongoose.Types.ObjectId(),
            sellingPointName: 'Test Point',
            items: [{
                originalGoodId: good._id,
                fullName: 'Sukienka BŁĘKITNY+ZŁOTY elegancka',
                category: 'Sukienki',
                price: 250
            }]
        };
        
        const priceList = new PriceList(priceListData);
        await priceList.save();

        // Update color name
        const response = await request(app)
            .patch(`/api/excel/color/update-color/${color._id}`)
            .send({
                Kol_Opis: 'TURKUSOWY*ZŁOTY'
            })
            .expect(200);

        // Check if good's fullName was updated
        const updatedGood = await Goods.findById(good._id);
        expect(updatedGood.fullName).toBe('Sukienka TURKUSOWY*ZŁOTY elegancka');

        // Check if price list item's fullName was updated
        const updatedPriceList = await PriceList.findById(priceList._id);
        expect(updatedPriceList.items[0].fullName).toBe('Sukienka TURKUSOWY*ZŁOTY elegancka');

        console.log('✅ Special characters in color name handled correctly');
    });
});