const controller = require('./controllers/admin/metadataController');
console.log('Controller loaded successfully');
console.log('Exports:', Object.keys(controller));

// Simulate req/res
const req = {};
const res = {
    status: function (s) {
        console.log('Status set to:', s);
        return this;
    },
    json: function (j) {
        console.log('JSON response:', JSON.stringify(j, null, 2).substring(0, 100) + '...');
    }
};

async function test() {
    try {
        await controller.getAdminMetadata(req, res);
        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

test();
