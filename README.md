## **Routing API with PostgreSQL and OSRM**

This project provides an API that allows users to calculate routes between two cities using OpenStreetMap (OSM) data stored in PostgreSQL and OSRM for route calculations.

---

### **Features**
- Query OSM data stored in PostgreSQL to fetch city coordinates.
- Calculate routes using OSRM (Open Source Routing Machine).
- Return JSON responses with route details, including distance and duration.

---

### **Technologies Used**
- **Node.js**: Backend framework.
- **Express.js**: For building the API.
- **PostgreSQL**: For storing OSM data.
- **OSRM**: For calculating routes.
- **Docker**: For containerized deployment.

---

### **Setup Instructions**

#### **1. Prerequisites**
- Docker installed on your machine.
- Node.js installed.
- OSM data file (`israel-and-palestine-latest.osm.pbf`).

#### **2. Clone the Repository**
```bash
git clone https://github.com/IsraelNatanov/Route-api
cd routing-api
```

#### **3. Prepare the Database**

1. **Run PostgreSQL in Docker:**
   ```bash
   docker run --name postgres -e POSTGRES_USER=geouser -e POSTGRES_PASSWORD=geosecret -e POSTGRES_DB=geodb -p 5432:5432 -d postgis/postgis:15-3.3
   ```

2. **Import OSM Data:**
   Use `osm2pgsql` to import the data into PostgreSQL:
   ```bash
   osm2pgsql --create --slim --hstore --database=geodb israel-and-palestine-latest.osm.pbf
   ```

3. **Verify Data Import:**
   Connect to the database:
   ```bash
   docker exec -it postgres psql -U geouser -d geodb
   ```
   Check data in `planet_osm_point`:
   ```sql
   SELECT COUNT(*) FROM planet_osm_point;
   ```

---

#### **4. Run OSRM Backend**

1. **Prepare OSRM Files:**
   ```bash
   docker run -t -v $(pwd)/data:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/israel-and-palestine-latest.osm.pbf
   docker run -t -v $(pwd)/data:/data osrm/osrm-backend osrm-contract /data/israel-and-palestine-latest.osrm
   ```

2. **Start OSRM Routing Service:**
   ```bash
   docker run -t -i -p 5000:5000 -v $(pwd)/data:/data osrm/osrm-backend osrm-routed /data/israel-and-palestine-latest.osrm
   ```

---

#### **5. Install Node.js Dependencies**
```bash
npm install
```

---

#### **6. Run the Server**
Start the Node.js API server:
```bash
node app.js
```

The server will run at `http://localhost:3000`.

---

### **API Endpoints**

#### **1. Test API**
- **GET `/`**
- **Response**: `Welcome to the City Routing API!`

#### **2. Get Route**
- **GET `/route`**
- **Query Parameters**:
  - `startCity`: Name of the starting city.
  - `endCity`: Name of the destination city.
- **Example**:
  ```bash
  http://localhost:3000/route?startCity=Haifa&endCity=Jerusalem
  ```
- **Response**:
  ```json
  {
    "start": {
      "city": "Haifa",
      "coordinates": "34.989571,32.794046"
    },
    "end": {
      "city": "Jerusalem",
      "coordinates": "35.2137,31.7683"
    },
    "route": {
      "routes": [
        {
          "distance": 146000,
          "duration": 7200
        }
      ]
    }
  }
  ```

---

### **Troubleshooting**

1. **Error: "City not found"**
   - Verify that the city exists in the `planet_osm_point` table:
     ```sql
     SELECT DISTINCT tags->'addr:city' FROM planet_osm_point;
     ```

2. **OSRM Backend Not Responding**
   - Ensure the OSRM backend is running:
     ```bash
     curl http://localhost:5000/health
     ```

3. **Missing Data in PostgreSQL**
   - Re-import the OSM data using `osm2pgsql` with the correct parameters.

---

### **Future Improvements**
- Add support for multiple addresses in the same city.
- Improve error handling for unsupported cities.
- Add caching for frequently requested routes.

---

### **License**
This project is licensed under the MIT License.

