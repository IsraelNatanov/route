const express = require('express');
const { Client } = require('pg');
const axios = require('axios');

const app = express();
const port = 3000;


const dbClient = new Client({
  user: 'geouser',        
  host: 'localhost',     
  database: 'geodb',       
  password: 'geosecret',   
  port: 5432,            
});

dbClient.connect();


app.get('/', (req, res) => {
  res.send('Welcome to the Routing API!');
});


app.get('/route', async (req, res) => {
  const { startStreet, startCity, endStreet, endCity } = req.query;

  if (!startStreet || !startCity || !endStreet || !endCity) {
    return res.status(400).json({
      error: 'Please provide startStreet, startCity, endStreet, and endCity.',
    });
  }

  try {

    const startQuery = `
      SELECT 
        ST_X(ST_Transform(way, 4326)) AS longitude, 
        ST_Y(ST_Transform(way, 4326)) AS latitude
      FROM planet_osm_point
      WHERE tags->'addr:street' = $1 AND tags->'addr:city' = $2
      LIMIT 1;
    `;
    const startResult = await dbClient.query(startQuery, [startStreet, startCity]);

    if (startResult.rows.length === 0) {
      return res.status(404).json({ error: `Start address '${startStreet}, ${startCity}' not found.` });
    }

    const startCoords = `${startResult.rows[0].longitude},${startResult.rows[0].latitude}`;


    const endQuery = `
      SELECT 
        ST_X(ST_Transform(way, 4326)) AS longitude, 
        ST_Y(ST_Transform(way, 4326)) AS latitude
      FROM planet_osm_point
      WHERE tags->'addr:street' = $1 AND tags->'addr:city' = $2
      LIMIT 1;
    `;
    const endResult = await dbClient.query(endQuery, [endStreet, endCity]);

    if (endResult.rows.length === 0) {
      return res.status(404).json({ error: `End address '${endStreet}, ${endCity}' not found.` });
    }

    const endCoords = `${endResult.rows[0].longitude},${endResult.rows[0].latitude}`;


    const osrmUrl = `http://localhost:5000/route/v1/driving/${startCoords};${endCoords}?overview=full&steps=true&geometries=polyline`;
    const routeResponse = await axios.get(osrmUrl);

    const routeData = routeResponse.data.routes[0];
    const durationMinutes = Math.round(routeData.duration / 60);
    const distanceKm = (routeData.distance / 1000).toFixed(2);

    res.json({
      start: { street: startStreet, city: startCity, coordinates: startCoords },
      end: { street: endStreet, city: endCity, coordinates: endCoords },
      route: {
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        polyline: routeData.geometry,
        steps: routeData.legs[0].steps.map(step => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
        })),
      },
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
