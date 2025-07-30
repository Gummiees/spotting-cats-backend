const { nsfwService } = require('../dist/services/nsfwService.js');

async function testNSFWService() {
  try {
    console.log('🚀 Testing NSFW Service...');

    // Load the model
    console.log('📦 Loading NSFW model...');
    await nsfwService.loadModel();

    // Test with a sample image URL (a safe cat image)
    const testImageUrl =
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop';

    console.log('🔍 Testing image classification...');
    const result = await nsfwService.validateImages([testImageUrl]);

    console.log('📊 Results:');
    console.log('- Is valid:', result.isValid);
    console.log('- Invalid images:', result.invalidImages);
    console.log('- Errors:', result.errors);

    if (result.isValid) {
      console.log('✅ NSFW service is working correctly!');
    } else {
      console.log('❌ NSFW service detected issues with test image');
    }
  } catch (error) {
    console.error('❌ Error testing NSFW service:', error);
  }
}

// Run the test
testNSFWService();
