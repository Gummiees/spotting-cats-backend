const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  const formData = new FormData();

  // Add some test data
  formData.append('name', 'Test Cat');
  formData.append('age', '3');
  formData.append('xCoordinate', '-73.935242');
  formData.append('yCoordinate', '40.730610');
  formData.append('isDomestic', 'true');
  formData.append('isMale', 'true');
  formData.append('isSterilized', 'false');
  formData.append('isFriendly', 'true');
  formData.append('breed', 'Persian');
  formData.append('extraInfo', 'Very friendly cat, loves children');

  // Try to add a test image if it exists
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  if (fs.existsSync(testImagePath)) {
    formData.append('images', fs.createReadStream(testImagePath));
    console.log('✅ Test image found and added to FormData');
  } else {
    console.log('⚠️ No test image found at:', testImagePath);
    console.log('Create a test image file to test image upload functionality');
  }

  console.log('\n📋 FormData contents:');
  console.log('- name: Test Cat');
  console.log('- age: 3');
  console.log('- xCoordinate: -73.935242');
  console.log('- yCoordinate: 40.730610');
  console.log('- isDomestic: true');
  console.log('- isMale: true');
  console.log('- isSterilized: false');
  console.log('- isFriendly: true');
  console.log('- breed: Persian');
  console.log('- extraInfo: Very friendly cat, loves children');

  console.log('\n🚀 To test the API:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Use curl or Postman to send a POST request to:');
  console.log('   POST http://localhost:3000/api/v1/cats');
  console.log('3. Set Content-Type to multipart/form-data');
  console.log('4. Include the FormData with the fields above');
  console.log('5. Add image files to the "images" field');

  console.log('\n📝 Example curl command:');
  console.log('curl -X POST http://localhost:3000/api/v1/cats \\');
  console.log('  -H "Content-Type: multipart/form-data" \\');
  console.log('  -F "name=Test Cat" \\');
  console.log('  -F "age=3" \\');
  console.log('  -F "xCoordinate=-73.935242" \\');
  console.log('  -F "yCoordinate=40.730610" \\');
  console.log('  -F "isDomestic=true" \\');
  console.log('  -F "isMale=true" \\');
  console.log('  -F "isSterilized=false" \\');
  console.log('  -F "isFriendly=true" \\');
  console.log('  -F "breed=Persian" \\');
  console.log('  -F "extraInfo=Very friendly cat, loves children" \\');
  console.log('  -F "images=@test-image.jpg"');
}

testImageUpload().catch(console.error);
