# Restaurants with Circular Tables

A simple website for tracking and sharing restaurants with circular tables.

## About

This project allows users to mark and track restaurants that have circular tables on an interactive map. Users can:

- Add restaurants by name, address, and notes
- Click directly on the map to add a restaurant at that location
- View a list of all saved restaurants
- Delete restaurants they've added
- View restaurant details on the map

## Features

- Interactive map using Leaflet.js and OpenStreetMap
- Geolocation to center the map on the user's location
- Local storage to save restaurant data in the browser
- Address geocoding using Nominatim API
- Mobile-friendly responsive design with Tailwind CSS
- Custom markers and animations

## Technology Stack

- HTML5
- JavaScript (vanilla, no frameworks)  
- Tailwind CSS for styling
- Google Maps JavaScript API for maps
- Vercel Functions for serverless API
- Vercel KV for data storage

## Getting Started

### Local Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make sure you have a `.env` file with your Google Maps API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:3000`

The `vercel dev` command will:
- Serve static files 
- Run the API functions locally
- Handle environment variables from `.env`

### Production Deployment

This app is designed to be deployed on Vercel. Simply connect your GitHub repository to Vercel and it will automatically deploy with each push.

## Future Enhancements

Potential future enhancements for this project could include:

- User accounts and authentication
- Backend API and database for shared restaurant data
- Adding photos of the circular tables
- Rating system for restaurants
- Filters for search (e.g., price range, cuisine type)
- Social sharing features

## Contributing

Feel free to fork this project and contribute by submitting a pull request.

## License

This project is open source and available under the MIT License. 