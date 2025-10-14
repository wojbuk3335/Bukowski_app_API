const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// BEZPIECZEŃSTWO: NIE importuj całej aplikacji, aby uniknąć połączenia z produkcyjną bazą
// const app = require('../app/app'); // USUNIĘTE dla bezpieczeństwa

// Models
const Goods = require('../app/db/models/goods');
const PriceList = require('../app/db/models/priceList');
const BagsCategory = require('../app/db/models/bagsCategory');
const Color = require('../app/db/models/color');
const Manufacturer = require('../app/db/models/manufacturer');
const User = require('../app/db/models/user');

describe('Bags Subcategory in Price List Tests', () => {
    let testBagsCategory1, testBagsCategory2;
    let testColor, testManufacturer;
    let testBag, testUser;
    let testPriceList;

    beforeAll(async () => {
        // Clean up test data
        await Goods.deleteMany({ fullName: { $regex: /TEST.*BAG/i } });
        await PriceList.deleteMany({ sellingPointName: /TEST/ });
        await BagsCategory.deleteMany({ Kat_1_Opis_1: { $regex: /TEST/ } });
        await Color.deleteMany({ Kol_Opis: 'TEST_COLOR' });
        await Manufacturer.deleteMany({ Prod_Opis: 'TEST_MANUFACTURER' });
        await User.deleteMany({ username: 'test_user' });
    });

    beforeEach(async () => {
        // Create test data
        testBagsCategory1 = new BagsCategory({
            _id: new mongoose.Types.ObjectId(),
            Kat_1_Kod_1: 'TEST1',
            Kat_1_Opis_1: 'TEST Torebka damska',
            Plec: 'D'
        });
        await testBagsCategory1.save();

        testBagsCategory2 = new BagsCategory({
            _id: new mongoose.Types.ObjectId(),
            Kat_1_Kod_1: 'TEST2',
            Kat_1_Opis_1: 'TEST Torebka męska',
            Plec: 'M'
        });
        await testBagsCategory2.save();

        testColor = new Color({
            _id: new mongoose.Types.ObjectId(),
            Kol_Kod: 'TEST_COL',
            Kol_Opis: 'TEST_COLOR'
        });
        await testColor.save();

        testManufacturer = new Manufacturer({
            _id: new mongoose.Types.ObjectId(),
            Prod_Kod: 'TEST_MAN',
            Prod_Opis: 'TEST_MANUFACTURER'
        });
        await testManufacturer.save();

        testUser = new User({
            _id: new mongoose.Types.ObjectId(),
            name: 'TestUser',
            email: 'test@example.com',
            password: 'password123',
            symbol: 'TU',
            sellingPoint: 'TEST_POINT',
            location: 'Test Location',
            role: 'user',
            isActive: true
        });
        await testUser.save();

        // Create test bag
        testBag = new Goods({
            _id: new mongoose.Types.ObjectId(),
            color: testColor._id,
            bagProduct: 'TEST_BAG_001',
            bagId: 'test_bag_id',
            bagsCategoryId: testBagsCategory1._id,
            fullName: 'TEST BAG BLUE',
            code: 'TEST001',
            price: 100,
            discount_price: 0,
            category: 'Torebki',
            manufacturer: testManufacturer._id,
            Plec: 'D',
            picture: ''
        });
        await testBag.save();
    });

    afterEach(async () => {
        // Clean up after each test
        await Goods.deleteMany({ fullName: { $regex: /TEST.*BAG/i } });
        await PriceList.deleteMany({ sellingPointName: /TEST/ });
        await BagsCategory.deleteMany({ Kat_1_Opis_1: { $regex: /TEST/ } });
        await Color.deleteMany({ Kol_Opis: 'TEST_COLOR' });
        await Manufacturer.deleteMany({ Prod_Opis: 'TEST_MANUFACTURER' });
        await User.deleteMany({ username: 'test_user' });
    });

    describe('Price List Creation with Bags', () => {
        test('should create price list with bags and populate subcategories', async () => {
            const response = await request(app)
                .post(`/api/pricelists/${testUser._id}/create`)
                .expect(201);

            expect(response.body.message).toBe('Price list created successfully');
            expect(response.body.priceList).toBeDefined();
            expect(Array.isArray(response.body.priceList)).toBe(true);

            const bagInPriceList = response.body.priceList.find(item => 
                item.fullName === 'TEST BAG BLUE'
            );
            
            expect(bagInPriceList).toBeDefined();
            expect(bagInPriceList.category).toBe('Torebki');
            expect(bagInPriceList.bagsCategoryId).toBe(testBagsCategory1._id.toString());
        });

        test('should display subcategory in price list GET request', async () => {
            // First create the price list
            await request(app)
                .post(`/api/pricelists/${testUser._id}/create`)
                .expect(201);

            // Then get the price list and check subcategory population
            const response = await request(app)
                .get(`/api/pricelists/${testUser._id}`)
                .expect(200);

            expect(response.body.priceList).toBeDefined();
            expect(Array.isArray(response.body.priceList)).toBe(true);

            const bagInPriceList = response.body.priceList.find(item => 
                item.fullName === 'TEST BAG BLUE'
            );
            
            expect(bagInPriceList).toBeDefined();
            expect(bagInPriceList.category).toBe('Torebki');
            expect(bagInPriceList.subcategory).toBeDefined();
            expect(bagInPriceList.subcategory.Kat_1_Opis_1).toBe('TEST Torebka damska');
        });
    });

    describe('Automatic Synchronization', () => {
        beforeEach(async () => {
            // Create price list for synchronization tests
            await request(app)
                .post(`/api/pricelists/${testUser._id}/create`)
                .expect(201);
        });

        test('should detect bagsCategoryId changes in comparison', async () => {
            // Update bag's bagsCategoryId directly in database
            await Goods.updateOne(
                { _id: testBag._id },
                { $set: { bagsCategoryId: testBagsCategory2._id } }
            );

            // Check comparison
            const response = await request(app)
                .get(`/api/pricelists/${testUser._id}/compare`)
                .expect(200);

            expect(response.body.changes).toBeDefined();
            expect(response.body.changes.outdatedItems).toBeDefined();
            expect(response.body.changes.outdatedItems.length).toBeGreaterThan(0);

            const outdatedBag = response.body.changes.outdatedItems.find(item =>
                item.currentGood.fullName === 'TEST BAG BLUE'
            );
            expect(outdatedBag).toBeDefined();
        });

        test('should automatically sync price list when bag is updated via PUT', async () => {
            // Update bag via API (like from frontend)
            const updateResponse = await request(app)
                .put(`/api/excel/goods/${testBag._id}`)
                .send({
                    bagProduct: 'TEST_BAG_001',
                    bagId: 'test_bag_id',
                    bagsCategoryId: testBagsCategory2._id.toString(), // Change subcategory
                    color: testColor._id.toString(),
                    fullName: 'TEST BAG BLUE',
                    code: 'TEST001',
                    category: 'Torebki',
                    price: '100',
                    discount_price: '0',
                    manufacturer: testManufacturer._id.toString(),
                    sellingPoint: '',
                    barcode: '',
                    Plec: 'M',
                    priceExceptions: '[]',
                    priceKarpacz: '0',
                    discount_priceKarpacz: '0',
                    priceExceptionsKarpacz: '[]'
                })
                .expect(200);

            expect(updateResponse.body.message).toContain('synchronized');

            // Check if price list was automatically updated
            const priceListResponse = await request(app)
                .get(`/api/pricelists/${testUser._id}`)
                .expect(200);

            const bagInPriceList = priceListResponse.body.priceList.find(item => 
                item.fullName === 'TEST BAG BLUE'
            );
            
            expect(bagInPriceList).toBeDefined();
            expect(bagInPriceList.subcategory).toBeDefined();
            expect(bagInPriceList.subcategory.Kat_1_Opis_1).toBe('TEST Torebka męska');
        });

        test('should sync all price lists globally when bag subcategory changes', async () => {
            // Create second user and price list
            const testUser2 = new User({
                _id: new mongoose.Types.ObjectId(),
                name: 'TestUser2',
                email: 'test2@example.com',
                password: 'password123',
                symbol: 'TU2',
                sellingPoint: 'TEST_POINT_2',
                location: 'Test Location 2',
                role: 'user',
                isActive: true
            });
            await testUser2.save();

            await request(app)
                .post(`/api/pricelists/${testUser2._id}/create`)
                .expect(201);

            // Update bag's subcategory
            await request(app)
                .put(`/api/excel/goods/${testBag._id}`)
                .send({
                    bagProduct: 'TEST_BAG_001',
                    bagId: 'test_bag_id',
                    bagsCategoryId: testBagsCategory2._id.toString(),
                    color: testColor._id.toString(),
                    fullName: 'TEST BAG BLUE UPDATED',
                    code: 'TEST001',
                    category: 'Torebki',
                    price: '150',
                    discount_price: '0',
                    manufacturer: testManufacturer._id.toString(),
                    sellingPoint: '',
                    barcode: '',
                    Plec: 'M',
                    priceExceptions: '[]',
                    priceKarpacz: '0',
                    discount_priceKarpacz: '0',
                    priceExceptionsKarpacz: '[]'
                })
                .expect(200);

            // Check both price lists were updated
            const priceList1Response = await request(app)
                .get(`/api/pricelists/${testUser._id}`)
                .expect(200);

            const priceList2Response = await request(app)
                .get(`/api/pricelists/${testUser2._id}`)
                .expect(200);

            // Check first price list
            const bag1 = priceList1Response.body.priceList.find(item => 
                item.fullName === 'TEST BAG BLUE UPDATED'
            );
            expect(bag1).toBeDefined();
            expect(bag1.subcategory.Kat_1_Opis_1).toBe('TEST Torebka męska');

            // Check second price list
            const bag2 = priceList2Response.body.priceList.find(item => 
                item.fullName === 'TEST BAG BLUE UPDATED'
            );
            expect(bag2).toBeDefined();
            expect(bag2.subcategory.Kat_1_Opis_1).toBe('TEST Torebka męska');

            // Clean up
            await User.deleteOne({ _id: testUser2._id });
        });
    });

    describe('Manual Synchronization', () => {
        beforeEach(async () => {
            await request(app)
                .post(`/api/pricelists/${testUser._id}/create`)
                .expect(201);
        });

        test('should sync bags subcategories when manually triggered', async () => {
            // Update bag's bagsCategoryId directly in database (simulating external change)
            await Goods.updateOne(
                { _id: testBag._id },
                { $set: { bagsCategoryId: testBagsCategory2._id, fullName: 'TEST BAG BLUE MANUAL' } }
            );

            // Trigger manual sync
            const syncResponse = await request(app)
                .post('/api/pricelists/sync-all')
                .send({
                    updateOutdated: true,
                    addNew: false,
                    removeDeleted: false,
                    updatePrices: false
                })
                .expect(200);

            expect(syncResponse.body.message).toContain('synchronized');
            expect(syncResponse.body.totalUpdatedProducts).toBeGreaterThan(0);

            // Check if price list was updated
            const priceListResponse = await request(app)
                .get(`/api/pricelists/${testUser._id}`)
                .expect(200);

            const bagInPriceList = priceListResponse.body.priceList.find(item => 
                item.fullName === 'TEST BAG BLUE MANUAL'
            );
            
            expect(bagInPriceList).toBeDefined();
            expect(bagInPriceList.subcategory).toBeDefined();
            expect(bagInPriceList.subcategory.Kat_1_Opis_1).toBe('TEST Torebka męska');
        });
    });

    describe('Edge Cases', () => {
        test('should handle bag without bagsCategoryId gracefully', async () => {
            // Create bag without bagsCategoryId
            const bagWithoutCategory = new Goods({
                _id: new mongoose.Types.ObjectId(),
                color: testColor._id,
                bagProduct: 'TEST_BAG_NO_CAT',
                bagId: 'test_bag_no_cat',
                bagsCategoryId: null,
                fullName: 'TEST BAG NO CATEGORY',
                code: 'TEST002',
                price: 100,
                discount_price: 0,
                category: 'Torebki',
                manufacturer: testManufacturer._id,
                Plec: 'D',
                picture: ''
            });
            await bagWithoutCategory.save();

            const response = await request(app)
                .post(`/api/pricelists/${testUser._id}/create`)
                .expect(201);

            const bagInPriceList = response.body.priceList.find(item => 
                item.fullName === 'TEST BAG NO CATEGORY'
            );
            
            expect(bagInPriceList).toBeDefined();
            expect(bagInPriceList.category).toBe('Torebki');
            // Should not crash, subcategory should be null/empty
        });

        test('should handle non-existent bagsCategoryId gracefully', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            
            const bagWithInvalidCategory = new Goods({
                _id: new mongoose.Types.ObjectId(),
                color: testColor._id,
                bagProduct: 'TEST_BAG_INVALID',
                bagId: 'test_bag_invalid',
                bagsCategoryId: nonExistentId,
                fullName: 'TEST BAG INVALID CATEGORY',
                code: 'TEST003',
                price: 100,
                discount_price: 0,
                category: 'Torebki',
                manufacturer: testManufacturer._id,
                Plec: 'D',
                picture: ''
            });
            await bagWithInvalidCategory.save();

            // Should not crash when creating price list
            const response = await request(app)
                .post(`/api/pricelists/${testUser._id}/create`)
                .expect(201);

            expect(response.body.priceList).toBeDefined();
        });
    });
});