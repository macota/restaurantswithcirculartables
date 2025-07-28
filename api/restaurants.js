import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/restaurants - Get all restaurants
async function handleGet(req, res) {
  try {
    const restaurants = await kv.get('restaurants') || [];
    res.status(200).json(restaurants);
  } catch (error) {
    console.error('Error getting restaurants:', error);
    res.status(500).json({ error: 'Failed to get restaurants' });
  }
}

// POST /api/restaurants - Add a new restaurant
async function handlePost(req, res) {
  const { name, address, notes, lat, lng } = req.body;

  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
  }

  try {
    const restaurants = await kv.get('restaurants') || [];
    
    const newRestaurant = {
      id: Date.now().toString(),
      name,
      address: address || '',
      notes: notes || '',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      dateAdded: new Date().toISOString()
    };

    restaurants.push(newRestaurant);
    await kv.set('restaurants', restaurants);

    res.status(201).json(newRestaurant);
  } catch (error) {
    console.error('Error adding restaurant:', error);
    res.status(500).json({ error: 'Failed to add restaurant' });
  }
}

// PUT /api/restaurants - Update a restaurant
async function handlePut(req, res) {
  const { id, name, address, notes, lat, lng } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Restaurant ID is required' });
  }

  try {
    const restaurants = await kv.get('restaurants') || [];
    const index = restaurants.findIndex(r => r.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Update the restaurant
    restaurants[index] = {
      ...restaurants[index],
      name: name || restaurants[index].name,
      address: address !== undefined ? address : restaurants[index].address,
      notes: notes !== undefined ? notes : restaurants[index].notes,
      lat: lat !== undefined ? parseFloat(lat) : restaurants[index].lat,
      lng: lng !== undefined ? parseFloat(lng) : restaurants[index].lng,
    };

    await kv.set('restaurants', restaurants);

    res.status(200).json(restaurants[index]);
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
}

// DELETE /api/restaurants?id=123 - Delete a restaurant
async function handleDelete(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Restaurant ID is required' });
  }

  try {
    const restaurants = await kv.get('restaurants') || [];
    const filteredRestaurants = restaurants.filter(r => r.id !== id);

    if (filteredRestaurants.length === restaurants.length) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await kv.set('restaurants', filteredRestaurants);

    res.status(200).json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ error: 'Failed to delete restaurant' });
  }
}