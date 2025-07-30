# Image Update Guide

## How Image Updates Work

### **POST /api/v1/cats (Create)**
- **Images Required**: ✅ Yes, at least one image is mandatory
- **Behavior**: All provided images are uploaded to Cloudinary and saved

### **PUT /api/v1/cats/:id (Update)**

The update endpoint has flexible image handling:

#### **Scenario 1: No `FormData` sent**
- **Result**: ✅ **SUCCEEDS** - Existing images are preserved
- **Behavior**: Cat is updated with all other fields, images remain unchanged

#### **Scenario 2: `FormData` with new images**
- **Default Behavior**: New images are **ADDED** to existing images
- **Example**: Cat has 3 images → Upload 2 new images → Cat now has 5 images

#### **Scenario 3: Replace all images**
- **Method**: Set `replaceImages: true` in `FormData`
- **Behavior**: All existing images are replaced with new ones
- **Example**: Cat has 3 images → Upload 2 new images with `replaceImages: true` → Cat now has 2 images

#### **Scenario 4: Keep specific existing images + add new ones**
- **Method**: Send `keepImages` array with URLs to keep + upload new images via `FormData`
- **Behavior**: Keeps specified existing images and adds new uploaded images
- **Use Case**: When you want to remove some existing images and add new ones

#### **Scenario 5: Keep only specific existing images (no new uploads)**
- **Method**: Send `keepImages` array with URLs to keep (no `FormData` needed)
- **Behavior**: Keeps only the specified existing images
- **Use Case**: When you want to remove some existing images without adding new ones

#### **Scenario 6: Manual image URLs**
- **Method**: Send `imageUrls` array in request body (JSON)
- **Behavior**: Completely replaces all images with provided URLs
- **Use Case**: When you want precise control over which images to keep

## **API Examples**

### **Add new images to existing cat**
```bash
curl -X PUT http://localhost:3000/api/v1/cats/507f1f77bcf86cd799439011 \
  -H "Content-Type: multipart/form-data" \
  -F "name=Updated Fluffy" \
  -F "age=4" \
  -F "images=@new-image1.jpg" \
  -F "images=@new-image2.jpg"
```

### **Replace all images**
```bash
curl -X PUT http://localhost:3000/api/v1/cats/507f1f77bcf86cd799439011 \
  -H "Content-Type: multipart/form-data" \
  -F "name=Updated Fluffy" \
  -F "replaceImages=true" \
  -F "images=@new-image1.jpg" \
  -F "images=@new-image2.jpg"
```

### **Update without changing images**
```bash
curl -X PUT http://localhost:3000/api/v1/cats/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Fluffy", "age": 4}'
```

### **Keep specific existing images + add new ones**
```bash
curl -X PUT http://localhost:3000/api/v1/cats/507f1f77bcf86cd799439011 \
  -H "Content-Type: multipart/form-data" \
  -F "name=Updated Fluffy" \
  -F "keepImages[]=https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image1.jpg" \
  -F "images=@new-image.jpg"
```

### **Keep only specific existing images (no new uploads)**
```bash
curl -X PUT http://localhost:3000/api/v1/cats/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Fluffy",
    "keepImages": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image1.jpg"
    ]
  }'
```

### **Manual image URL management**
```bash
curl -X PUT http://localhost:3000/api/v1/cats/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Fluffy",
    "imageUrls": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image1.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image2.jpg"
    ]
  }'
```

## **Frontend JavaScript Examples**

### **Add new images**
```javascript
const formData = new FormData();
formData.append('name', 'Updated Fluffy');
formData.append('age', '4');
formData.append('images', newImageFile1);
formData.append('images', newImageFile2);

fetch('/api/v1/cats/507f1f77bcf86cd799439011', {
  method: 'PUT',
  body: formData,
  credentials: 'include'
});
```

### **Replace all images**
```javascript
const formData = new FormData();
formData.append('name', 'Updated Fluffy');
formData.append('replaceImages', 'true');
formData.append('images', newImageFile1);
formData.append('images', newImageFile2);

fetch('/api/v1/cats/507f1f77bcf86cd799439011', {
  method: 'PUT',
  body: formData,
  credentials: 'include'
});
```

### **Keep specific existing images + add new ones**
```javascript
const formData = new FormData();
formData.append('name', 'Updated Fluffy');
formData.append('keepImages[]', 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image1.jpg');
formData.append('images', newImageFile);

fetch('/api/v1/cats/507f1f77bcf86cd799439011', {
  method: 'PUT',
  body: formData,
  credentials: 'include'
});
```

### **Keep only specific existing images (no new uploads)**
```javascript
fetch('/api/v1/cats/507f1f77bcf86cd799439011', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Updated Fluffy',
    keepImages: [
      'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image1.jpg'
    ]
  }),
  credentials: 'include'
});
```

### **Update without images**
```javascript
fetch('/api/v1/cats/507f1f77bcf86cd799439011', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Updated Fluffy',
    age: 4
  }),
  credentials: 'include'
});
```

## **Key Points**

1. **Creation (POST)**: Images are always required
2. **Updates (PUT)**: Images are optional - existing images preserved by default
3. **Add Mode**: New images are added to existing ones (default)
4. **Replace Mode**: Use `replaceImages: true` to replace all images
5. **Selective Keep Mode**: Use `keepImages` array to keep specific existing images
6. **Manual Mode**: Use `imageUrls` array for precise control
7. **Backward Compatible**: Still supports the old `imageUrls` field

## **Your Specific Scenario**

**Problem**: Cat has 3 images, want to remove 2 and add 1 new image

**Solution**: Use `keepImages` + upload new image

```javascript
const formData = new FormData();
formData.append('name', 'Updated Fluffy');
formData.append('keepImages[]', 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/cats/image1.jpg'); // Keep this one
formData.append('images', newImageFile); // Add this new one

fetch('/api/v1/cats/507f1f77bcf86cd799439011', {
  method: 'PUT',
  body: formData,
  credentials: 'include'
});
```

**Result**: Cat now has 2 images (1 kept from original + 1 new)

This design provides maximum flexibility while maintaining data integrity! 🐱📸 