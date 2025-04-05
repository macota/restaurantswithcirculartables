// Initialize map and app functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map (centered on a default location - NYC)
    const map = L.map('map').setView([40.7128, -74.0060], 13);
    
    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 13);
            },
            error => {
                console.log('Error getting location:', error);
            }
        );
    }
    
    // Store for restaurants
    let restaurants = JSON.parse(localStorage.getItem('circularTableRestaurants')) || [];
    const markers = {};
    
    // UI Elements
    const addFormOverlay = document.getElementById('add-form-overlay');
    const toggleFormBtn = document.getElementById('toggle-form');
    const closeFormBtn = document.getElementById('close-form');
    const restaurantSidebar = document.getElementById('restaurant-sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
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
    
    // Initialize the map with existing restaurants
    function initializeMap() {
        restaurants.forEach(restaurant => {
            addMarkerToMap(restaurant);
        });
        updateRestaurantList();
    }
    
    // Add a marker to the map
    function addMarkerToMap(restaurant) {
        if (!restaurant.lat || !restaurant.lng) return;
        
        // Create a custom marker icon
        const markerIcon = L.divIcon({
            className: 'restaurant-marker',
            html: `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 18px; z-index: 2;">🍽️</span>
                    </div>
                   </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        const marker = L.marker([restaurant.lat, restaurant.lng], { icon: markerIcon })
            .addTo(map)
            .bindPopup(createPopupContent(restaurant), { 
                className: 'restaurant-popup',
                maxWidth: 300 
            });
        
        markers[restaurant.id] = marker;
        
        // Add pulse animation to new markers
        const markerElement = marker.getElement();
        if (markerElement) {
            markerElement.classList.add('pulse');
            setTimeout(() => {
                markerElement.classList.remove('pulse');
            }, 1000);
        }
    }
    
    // Create popup content
    function createPopupContent(restaurant) {
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1';
        popupContent.innerHTML = `
            <div class="circular-badge"></div>
            <h3 class="font-bold text-lg mb-1">${restaurant.name}</h3>
            ${restaurant.address ? `<p class="text-gray-600 text-sm mb-2">${restaurant.address}</p>` : ''}
            ${restaurant.notes ? `<p class="mt-2 mb-3">${restaurant.notes}</p>` : ''}
            <div class="mt-3 flex justify-between items-center">
                <div class="text-xs text-emerald-600">Added: ${formatDate(restaurant.dateAdded)}</div>
                <button class="delete-restaurant text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full" data-id="${restaurant.id}">
                    Delete
                </button>
            </div>
        `;
        
        // Add event listener to delete button
        setTimeout(() => {
            const deleteButton = document.querySelector(`.delete-restaurant[data-id="${restaurant.id}"]`);
            if (deleteButton) {
                deleteButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    deleteRestaurant(restaurant.id);
                });
            }
        }, 100);
        
        return popupContent;
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
                    map.setView([restaurant.lat, restaurant.lng], 16);
                    markers[restaurant.id].openPopup();
                }
            });
            
            item.querySelector('.delete-restaurant').addEventListener('click', () => {
                deleteRestaurant(restaurant.id);
            });
            
            restaurantList.appendChild(item);
        });
    }
    
    // Search functionality
    function searchRestaurants(query) {
        if (!query.trim()) {
            // If search is empty, show all restaurants
            updateRestaurantList();
            return;
        }
        
        const bounds = map.getBounds();
        
        // Filter restaurants by name/address/notes and within current map bounds
        const filtered = restaurants.filter(restaurant => {
            // Check if restaurant is within current map bounds
            const inBounds = bounds.contains([restaurant.lat, restaurant.lng]);
            
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
    
    // Set up search event listeners
    searchButton.addEventListener('click', () => {
        searchRestaurants(searchInput.value);
    });
    
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchRestaurants(searchInput.value);
        }
    });
    
    // Map move and zoom events for search updating
    let searchTimeout;
    map.on('moveend', () => {
        // Update search results when map stops moving
        if (searchInput.value.trim()) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchRestaurants(searchInput.value);
            }, 500);
        }
    });
    
    // Delete a restaurant
    function deleteRestaurant(id) {
        // Remove marker from map
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
        
        // Remove from array
        restaurants = restaurants.filter(r => r.id !== id);
        
        // Update localStorage
        localStorage.setItem('circularTableRestaurants', JSON.stringify(restaurants));
        
        // Update UI
        updateRestaurantList();
    }
    
    // Handle form submission
    const restaurantForm = document.getElementById('restaurant-form');
    
    restaurantForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('name');
        const addressInput = document.getElementById('address');
        const notesInput = document.getElementById('notes');
        
        if (!nameInput.value.trim()) {
            alert('Please enter a restaurant name');
            return;
        }
        
        // Use Nominatim to geocode the address if provided
        if (addressInput.value.trim()) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput.value)}`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.length > 0) {
                        addRestaurant(
                            nameInput.value, 
                            addressInput.value, 
                            notesInput.value, 
                            parseFloat(data[0].lat), 
                            parseFloat(data[0].lon)
                        );
                    } else {
                        // If geocoding fails, add with map center coordinates
                        const center = map.getCenter();
                        addRestaurant(
                            nameInput.value, 
                            addressInput.value, 
                            notesInput.value, 
                            center.lat, 
                            center.lng
                        );
                    }
                    
                    // Hide the form after adding
                    addFormOverlay.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Geocoding error:', error);
                    const center = map.getCenter();
                    addRestaurant(
                        nameInput.value, 
                        addressInput.value, 
                        notesInput.value, 
                        center.lat, 
                        center.lng
                    );
                    
                    // Hide the form after adding
                    addFormOverlay.classList.add('hidden');
                });
        } else {
            // If no address, use the center of the map
            const center = map.getCenter();
            addRestaurant(
                nameInput.value, 
                '', 
                notesInput.value, 
                center.lat, 
                center.lng
            );
            
            // Hide the form after adding
            addFormOverlay.classList.add('hidden');
        }
        
        // Reset form
        restaurantForm.reset();
    });
    
    // Add restaurant function
    function addRestaurant(name, address, notes, lat, lng) {
        const restaurant = {
            id: Date.now().toString(),
            name: name,
            address: address,
            notes: notes,
            lat: lat,
            lng: lng,
            dateAdded: new Date().toISOString()
        };
        
        // Add to array
        restaurants.push(restaurant);
        
        // Save to localStorage
        localStorage.setItem('circularTableRestaurants', JSON.stringify(restaurants));
        
        // Add marker to map
        addMarkerToMap(restaurant);
        
        // Update list
        updateRestaurantList();
        
        // Center and zoom map to the new restaurant
        map.setView([lat, lng], 16);
    }
    
    // Handle map clicks to add restaurants directly
    map.on('click', function(e) {
        const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div class="p-3">
                    <div class="circular-dot-pattern absolute top-0 left-0 right-0 bottom-0 opacity-5"></div>
                    <h3 class="font-bold text-lg mb-3 relative">Add a New Restaurant</h3>
                    <form id="quick-add-form" class="relative z-10">
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
            `)
            .openOn(map);
            
        // Handle quick-add form submission
        setTimeout(() => {
            const quickAddForm = document.getElementById('quick-add-form');
            if (quickAddForm) {
                quickAddForm.addEventListener('submit', function(evt) {
                    evt.preventDefault();
                    
                    const quickName = document.getElementById('quick-name');
                    const quickNotes = document.getElementById('quick-notes');
                    
                    if (quickName && quickName.value.trim()) {
                        addRestaurant(
                            quickName.value,
                            '',
                            quickNotes ? quickNotes.value : '',
                            e.latlng.lat,
                            e.latlng.lng
                        );
                        map.closePopup();
                    }
                });
            }
        }, 100);
    });
    
    // Initialize the app
    initializeMap();
}); 