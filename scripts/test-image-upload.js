const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testImageUpdate() {
  const catId = '689233f4834a00e23a747816';
  const baseUrl = 'https://spotting-cats-backend-staging.up.railway.app';

  // First, get the current cat
  console.log('=== Getting current cat ===');
  const getResponse = await fetch(`${baseUrl}/api/v1/cats/${catId}`, {
    method: 'GET',
    headers: {
      Cookie:
        'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcwZGRkZDAxZDJkZGY2ZjUxMmNiMzQiLCJlbWFpbCI6InhhdmljYXJvbWlyb0BnbWFpbC5jb20iLCJ1c2VybmFtZSI6Ikd1bW1pZWVzIiwicm9sZSI6InN1cGVyYWRtaW4iLCJpYXQiOjE3NTQwNDQxMzAsImV4cCI6MTc1NDY0ODkzMH0.XikwR586WlBkIz4BwfTNXT92cwm03gtM4qQjI6IB6i8',
    },
  });

  const catData = await getResponse.json();
  console.log('Original images:', catData.data.imageUrls);
  console.log('Original count:', catData.data.imageUrls.length);

  // Create a test image file (1x1 pixel PNG)
  const testImagePath = path.join(__dirname, 'test-image.png');
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(testImagePath, testImageBuffer);

  // Create FormData for update
  const formData = new FormData();
  formData.append('name', 'Batman');
  formData.append('age', '10');
  formData.append('breed', 'Tuxedo');
  formData.append('xCoordinate', '0');
  formData.append('yCoordinate', '0');
  formData.append('extraInfo', 'wapeton');
  formData.append('isDomestic', 'true');
  formData.append('isMale', 'true');
  formData.append('isSterilized', 'true');
  formData.append('isFriendly', 'true');
  formData.append('images', fs.createReadStream(testImagePath), {
    filename: 'test-image.png',
    contentType: 'image/png',
  });

  console.log('=== Updating cat with new image ===');
  const updateResponse = await fetch(`${baseUrl}/api/v1/cats/${catId}`, {
    method: 'PUT',
    headers: {
      Cookie:
        'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcwZGRkZDAxZDJkZGY2ZjUxMmNiMzQiLCJlbWFpbCI6InhhdmljYXJvbWlyb0BnbWFpbC5jb20iLCJ1c2VybmFtZSI6Ikd1bW1pZWVzIiwicm9sZSI6InN1cGVyYWRtaW4iLCJpYXQiOjE3NTQwNDQxMzAsImV4cCI6MTc1NDY0ODkzMH0.XikwR586WlBkIz4BwfTNXT92cwm03gtM4qQjI6IB6i8',
      ...formData.getHeaders(),
    },
    body: formData,
  });

  const updateResult = await updateResponse.json();
  console.log('Update result:', updateResult);

  // Get the cat again to see the changes
  console.log('=== Getting updated cat ===');
  const getResponse2 = await fetch(`${baseUrl}/api/v1/cats/${catId}`, {
    method: 'GET',
    headers: {
      Cookie:
        'auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODcwZGRkZDAxZDJkZGY2ZjUxMmNiMzQiLCJlbWFpbCI6InhhdmljYXJvbWlyb0BnbWFpbC5jb20iLCJ1c2VybmFtZSI6Ikd1bW1pZWVzIiwicm9sZSI6InN1cGVyYWRtaW4iLCJpYXQiOjE3NTQwNDQxMzAsImV4cCI6MTc1NDY0ODkzMH0.XikwR586WlBkIz4BwfTNXT92cwm03gtM4qQjI6IB6i8',
    },
  });

  const catData2 = await getResponse2.json();
  console.log('Updated images:', catData2.data.imageUrls);
  console.log('Updated count:', catData2.data.imageUrls.length);

  // Clean up
  fs.unlinkSync(testImagePath);

  console.log('=== Summary ===');
  console.log('Original count:', catData.data.imageUrls.length);
  console.log('Updated count:', catData2.data.imageUrls.length);
  console.log('Expected count:', catData.data.imageUrls.length + 1);

  // Check if any images were replaced
  const originalUrls = new Set(catData.data.imageUrls);
  const updatedUrls = new Set(catData2.data.imageUrls);
  const replacedImages = catData.data.imageUrls.filter(
    (url) => !updatedUrls.has(url)
  );
  const newImages = catData2.data.imageUrls.filter(
    (url) => !originalUrls.has(url)
  );

  console.log('Replaced images:', replacedImages);
  console.log('New images:', newImages);

  // Detailed analysis
  console.log('\n=== Detailed Analysis ===');
  console.log('Original URLs:');
  catData.data.imageUrls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });

  console.log('\nUpdated URLs:');
  catData2.data.imageUrls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });

  if (replacedImages.length > 0) {
    console.log('\n⚠️  WARNING: Images were replaced instead of added!');
    console.log(
      'This suggests there might be a limit or bug in the image handling logic.'
    );
  } else if (newImages.length > 0) {
    console.log('\n✅ SUCCESS: New images were added correctly!');
  } else {
    console.log('\n❓ UNEXPECTED: No changes detected in images.');
  }
}

testImageUpdate().catch(console.error);
