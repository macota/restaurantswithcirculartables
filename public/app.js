// Global variables
let map;
let restaurants = [];
let markers = {};
let infoWindow;

// Global callback for Google Maps API
window.initGoogleMaps = function() {
    if (window._mapsLoadResolve) {
        window._mapsLoadResolve();
        delete window._mapsLoadResolve;
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load Google Maps API key from our secure endpoint
        const configResponse = await fetch('/api/maps-config');
        const config = await configResponse.json();
        
        if (!config.apiKey) {
            throw new Error('Failed to load Google Maps API key');
        }

        // Dynamically load Google Maps API with proper async loading
        await loadGoogleMaps(config.apiKey);
        
        // Initialize the map and load restaurants
        await initializeApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to load Google Maps. Please refresh the page.');
    }
});

// Load Google Maps API dynamically
function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;
        
        script.onerror = () => {
            reject(new Error('Failed to load Google Maps API'));
        };
        
        // The resolve will be called by the global callback
        window._mapsLoadResolve = resolve;
        
        document.head.appendChild(script);
    });
}

// Initialize the application after Google Maps is loaded
async function initializeApp() {
    // Initialize the map (centered on NYC by default)
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    });

    // Initialize info window
    infoWindow = new google.maps.InfoWindow();

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setCenter({ lat: latitude, lng: longitude });
            },
            error => {
                console.log('Error getting location:', error);
            }
        );
    }

    // Load existing restaurants from API
    await loadRestaurants();

    // Set up UI event listeners
    setupUIEventListeners();

    // Set up map click listener for adding restaurants
    map.addListener('click', handleMapClick);
}

// Load restaurants from API
async function loadRestaurants() {
    try {
        const response = await fetch('/api/restaurants');
        const data = await response.json();
        
        // Ensure we have an array
        restaurants = Array.isArray(data) ? data : [];
        
        // Add markers for all restaurants
        restaurants.forEach(restaurant => {
            addMarkerToMap(restaurant);
        });
        
        updateRestaurantList();
    } catch (error) {
        console.error('Error loading restaurants:', error);
        // Fallback to empty array
        restaurants = [];
        updateRestaurantList();
    }
}

// Add a marker to the map
function addMarkerToMap(restaurant) {
    if (!restaurant.lat || !restaurant.lng) return;

    const marker = new google.maps.Marker({
        position: { lat: restaurant.lat, lng: restaurant.lng },
        map: map,
        title: restaurant.name,
        icon: {
            url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#059669" stroke="#ffffff" stroke-width="2"/>
                    <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="16">🍽️</text>
                </svg>
            `),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
        }
    });

    // Add click listener to show info window
    marker.addListener('click', () => {
        infoWindow.setContent(createPopupContent(restaurant));
        infoWindow.open(map, marker);
    });

    markers[restaurant.id] = marker;
}

// Create popup content for restaurant info window
function createPopupContent(restaurant) {
    return `
        <div class="p-3" style="min-width: 200px;">
            <h3 class="font-bold text-lg mb-2">${restaurant.name}</h3>
            ${restaurant.address ? `<p class="text-gray-600 text-sm mb-2">${restaurant.address}</p>` : ''}
            ${restaurant.notes ? `<p class="mb-3">${restaurant.notes}</p>` : ''}
            <div class="flex justify-between items-center mt-3">
                <div class="text-xs text-emerald-600">Added: ${formatDate(restaurant.dateAdded)}</div>
                <button onclick="deleteRestaurant('${restaurant.id}')" class="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full">
                    Delete
                </button>
            </div>
        </div>
    `;
}

// Set up UI event listeners
function setupUIEventListeners() {
    const addFormOverlay = document.getElementById('add-form-overlay');
    const toggleFormBtn = document.getElementById('toggle-form');
    const closeFormBtn = document.getElementById('close-form');
    const restaurantSidebar = document.getElementById('restaurant-sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const restaurantForm = document.getElementById('restaurant-form');

    // Toggle form overlay
    toggleFormBtn.addEventListener('click', () => {
        addFormOverlay.classList.toggle('hidden');
    });

    closeFormBtn.addEventListener('click', () => {
        addFormOverlay.classList.add('hidden');
    });

    // Toggle sidebar
    toggleSidebarBtn.addEventListener('click', () => {
        restaurantSidebar.classList.toggle('sidebar-collapsed');
    });

    // Search functionality
    searchButton.addEventListener('click', () => {
        searchRestaurants(searchInput.value);
    });

    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchRestaurants(searchInput.value);
        }
    });

    // Form submission
    restaurantForm.addEventListener('submit', handleFormSubmission);
}

// Handle form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('name');
    const addressInput = document.getElementById('address');
    const notesInput = document.getElementById('notes');
    
    if (!nameInput.value.trim()) {
        alert('Please enter a restaurant name');
        return;
    }

    try {
        let lat, lng;
        
        // If address is provided, geocode it
        if (addressInput.value.trim()) {
            const geocodeResponse = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput.value)}`);
            
            if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                lat = geocodeData.lat;
                lng = geocodeData.lng;
            } else {
                // If geocoding fails, use map center
                const center = map.getCenter();
                lat = center.lat();
                lng = center.lng();
            }
        } else {
            // If no address, use map center
            const center = map.getCenter();
            lat = center.lat();
            lng = center.lng();
        }

        // Add restaurant via API
        await addRestaurant(nameInput.value, addressInput.value, notesInput.value, lat, lng);
        
        // Reset form and hide overlay
        restaurantForm.reset();
        document.getElementById('add-form-overlay').classList.add('hidden');
        
    } catch (error) {
        console.error('Error adding restaurant:', error);
        alert('Failed to add restaurant. Please try again.');
    }
}

// Add restaurant via API
async function addRestaurant(name, address, notes, lat, lng) {
    try {
        const response = await fetch('/api/restaurants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                address: address,
                notes: notes,
                lat: lat,
                lng: lng
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add restaurant');
        }

        const newRestaurant = await response.json();
        
        // Add to local array
        restaurants.push(newRestaurant);
        
        // Add marker to map
        addMarkerToMap(newRestaurant);
        
        // Update UI
        updateRestaurantList();
        
        // Center map on new restaurant
        map.setCenter({ lat: newRestaurant.lat, lng: newRestaurant.lng });
        map.setZoom(16);
        
    } catch (error) {
        console.error('Error adding restaurant:', error);
        throw error;
    }
}

// Delete restaurant
async function deleteRestaurant(id) {
    try {
        const response = await fetch(`/api/restaurants?id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete restaurant');
        }

        // Remove marker from map
        if (markers[id]) {
            markers[id].setMap(null);
            delete markers[id];
        }

        // Remove from local array
        restaurants = restaurants.filter(r => r.id !== id);
        
        // Update UI
        updateRestaurantList();
        
        // Close any open info windows
        infoWindow.close();
        
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        alert('Failed to delete restaurant. Please try again.');
    }
}

// Update the restaurant list in the UI
function updateRestaurantList(filteredList = null) {
    const restaurantList = document.getElementById('restaurant-list');
    const noRestaurantsMessage = document.getElementById('no-restaurants');
    const displayList = filteredList || restaurants;
    
    if (displayList.length === 0) {
        noRestaurantsMessage.style.display = 'block';
        restaurantList.innerHTML = '';
        restaurantList.appendChild(noRestaurantsMessage);
        return;
    }
    
    noRestaurantsMessage.style.display = 'none';
    restaurantList.innerHTML = '';
    
    displayList.forEach(restaurant => {
        const item = document.createElement('div');
        item.className = 'restaurant-item p-3 bg-white rounded-md shadow-sm';
        item.setAttribute('data-id', restaurant.id);
        item.innerHTML = `
            <h3 class="font-bold">${restaurant.name}</h3>
            ${restaurant.address ? `<p class="text-gray-600 text-sm">${restaurant.address}</p>` : ''}
            <div class="flex justify-between items-center mt-2">
                <button class="view-on-map text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-full">
                    View on map
                </button>
                <button class="delete-restaurant text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full">
                    Delete
                </button>
            </div>
        `;
        
        // Add event listeners
        item.querySelector('.view-on-map').addEventListener('click', () => {
            if (markers[restaurant.id]) {
                map.setCenter({ lat: restaurant.lat, lng: restaurant.lng });
                map.setZoom(16);
                google.maps.event.trigger(markers[restaurant.id], 'click');
            }
        });
        
        item.querySelector('.delete-restaurant').addEventListener('click', () => {
            deleteRestaurant(restaurant.id);
        });
        
        restaurantList.appendChild(item);
    });
}

// Search restaurants
function searchRestaurants(query) {
    if (!query.trim()) {
        updateRestaurantList();
        return;
    }
    
    const bounds = map.getBounds();
    
    const filtered = restaurants.filter(restaurant => {
        // Check if restaurant is within current map bounds
        const position = new google.maps.LatLng(restaurant.lat, restaurant.lng);
        const inBounds = bounds.contains(position);
        
        // Match by name/address/notes
        const matchesQuery = (
            restaurant.name.toLowerCase().includes(query.toLowerCase()) ||
            (restaurant.address && restaurant.address.toLowerCase().includes(query.toLowerCase())) ||
            (restaurant.notes && restaurant.notes.toLowerCase().includes(query.toLowerCase()))
        );
        
        return inBounds && matchesQuery;
    });
    
    updateRestaurantList(filtered);
}

// Handle map clicks to add restaurants
function handleMapClick(event) {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    const content = `
        <div class="p-3" style="min-width: 250px;">
            <h3 class="font-bold text-lg mb-3">Add a New Restaurant</h3>
            <form id="quick-add-form">
                <div class="mb-3">
                    <label class="block text-sm mb-1">Name:</label>
                    <input type="text" id="quick-name" class="border rounded-full p-2 px-4 w-full text-sm" required>
                </div>
                <div class="mb-3">
                    <label class="block text-sm mb-1">Notes:</label>
                    <textarea id="quick-notes" class="border rounded-xl p-2 px-4 w-full text-sm" rows="2"></textarea>
                </div>
                <div class="flex justify-end">
                    <button type="submit" class="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm hover:bg-emerald-700">
                        Add Restaurant
                    </button>
                </div>
            </form>
        </div>
    `;
    
    infoWindow.setContent(content);
    infoWindow.setPosition(event.latLng);
    infoWindow.open(map);
    
    // Handle form submission after a short delay to ensure DOM is ready
    setTimeout(() => {
        const quickAddForm = document.getElementById('quick-add-form');
        if (quickAddForm) {
            quickAddForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const quickName = document.getElementById('quick-name');
                const quickNotes = document.getElementById('quick-notes');
                
                if (quickName && quickName.value.trim()) {
                    try {
                        await addRestaurant(
                            quickName.value,
                            '',
                            quickNotes ? quickNotes.value : '',
                            lat,
                            lng
                        );
                        infoWindow.close();
                    } catch (error) {
                        alert('Failed to add restaurant. Please try again.');
                    }
                }
            });
        }
    }, 100);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
    }).format(date);
}