const app = require('./app');

async function testRoute() {
    try {
        console.log('Testing /api/admin/metadata registration...');

        // Find the metadata layer
        const metadataLayer = app._router.stack.find(layer => {
            return layer.regexp && layer.regexp.test('/api/admin/metadata');
        });

        if (metadataLayer) {
            console.log('SUCCESS: /api/admin/metadata base path is registered!');
            console.log('Name:', metadataLayer.name);
            console.log('Regexp:', metadataLayer.regexp.toString());

            // If it's a router, check its stack
            if (metadataLayer.handle && metadataLayer.handle.stack) {
                console.log('Nested routes found:');
                metadataLayer.handle.stack.forEach(s => {
                    if (s.route) {
                        console.log(` - [${Object.keys(s.route.methods).join(',').toUpperCase()}] ${s.route.path}`);
                    }
                });
            }
        } else {
            console.log('FAILURE: /api/admin/metadata route is NOT registered!');
            console.log('All registered top-level paths:');
            app._router.stack.forEach(l => {
                if (l.regexp) console.log(' - ' + l.regexp.toString());
            });
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testRoute();
