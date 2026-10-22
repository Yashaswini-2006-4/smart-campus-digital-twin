# 🏫 Smart Campus Digital Twin

> An intelligent campus monitoring and management platform that combines real-time campus data, AI/ML predictions, anomaly detection, and role-based dashboards to support smarter campus operations.

🌐 **Live Demo:** [Smart Campus Digital Twin](https://smart-campus-digital-twin-mobile.vercel.app)

📂 **GitHub Repository:** [smart-campus-digital-twin](https://github.com/Yashaswini-2006-4/smart-campus-digital-twin)

---

## 📌 Project Overview

The **Smart Campus Digital Twin** is a campus monitoring and management system designed to provide a digital view of campus operations. It combines a mobile/web frontend, backend services, database management, and AI/ML capabilities to help users monitor campus conditions and make informed decisions.

The application supports different campus users, including students, faculty members, administrators, and maintenance staff. Depending on their role, users can access relevant dashboards and operational features.

The project incorporates campus occupancy monitoring, energy consumption analysis, environmental data, anomaly detection, campus health assessment, AI-based recommendations, and what-if simulations.

The main goal is to improve campus visibility, resource utilization, maintenance coordination, and operational decision-making through a unified digital platform.

## ✨ Key Features

### 🔐 1. Authentication and Role-Based Access

- User registration and login.
- Password hashing using bcrypt.
- JWT-based authentication.
- Token verification and protected API routes.
- Role-based access control.
- Separate dashboards for students, faculty, administrators, and maintenance staff.
- Access restrictions for role-specific operations.

### 🏢 2. Campus Resource Management

The Node.js backend provides APIs for managing campus resources.

- **Building management:** Create, retrieve, update, and delete building records.
- **Department management:** Manage departments and their associated building information.
- **Room management:** Maintain room details, capacity, floor, type, and status.
- **Facility management:** Manage campus facilities, locations, operating hours, and availability.

Administrative permissions are used to restrict operations that should not be available to ordinary users.

### 📝 3. Complaint Management

- Submit campus complaints.
- Retrieve complaint records.
- Track complaint status and priority.
- Associate complaints with locations and reporting users.
- Support complaint handling by authorized staff.
- Record resolution details where supported by the backend.

### 🛠️ 4. Maintenance Management

- Create and retrieve maintenance tasks.
- Assign maintenance staff.
- Track maintenance status and scheduled dates.
- Store maintenance notes and completion information.
- Link maintenance tasks to complaints where supported.
- Provide maintenance-oriented dashboards and task views.

### 📊 5. Live Campus Data

The application includes interfaces for viewing campus readings and environmental information.

- Campus occupancy information.
- Energy consumption readings.
- Temperature and other environmental measurements.
- Historical or latest campus readings where data is available.
- Weather information through the configured weather service.

Displayed values depend on the availability of data and a working connection to the relevant backend service.

### 🤖 6. AI/ML Predictions

The Python backend supports AI/ML-related campus analysis and prediction features.

- **Occupancy Prediction:** Estimate campus occupancy using the available prediction pipeline.
- **Energy Prediction:** Present energy-related prediction results.
- **Anomaly Detection:** Identify unusual patterns in campus or sensor measurements.
- **Campus Health Score:** Calculate an overall score from campus condition indicators.
- **AI Recommendations:** Present recommendations based on available campus information and decision logic.
- **What-If Simulation:** Explore hypothetical changes to occupancy and energy conditions and examine their predicted effects.

Prediction quality and availability depend on the implemented models, input data, and backend configuration.

### 🏥 7. Campus Health Score

The Campus Health Score feature provides an overall assessment of campus conditions.

The Python API returns information including:

- Overall campus health score.
- Health status.
- Health-related insights.
- Occupancy component score.
- Energy component score.
- Anomaly component score.
- Model status and supporting input information.

The score and associated status help users understand whether campus conditions require attention.

### 🖥️ 8. Role-Based Dashboards

The mobile/web application includes screens for:

- Student Dashboard.
- Faculty Dashboard.
- Admin Dashboard.
- Maintenance Dashboard.

It also includes feature screens for occupancy prediction, energy prediction, anomaly detection, AI recommendations, campus health assessment, live campus data, class occupancy, maintenance tasks, and what-if simulation.

---

## 🏗️ System Architecture

The project uses separate Node.js and Python backend services.

```text
                 Users
                   |
                   v
        Mobile / Web Frontend
          React Native + Expo
                   |
          +--------+--------+
          |                 |
          v                 v
   Node.js Backend     Python Backend
   Express.js          FastAPI
   Port 5000            Port 8000
          |                 |
          v                 +-----------------+
       MongoDB               |        |        |
                             v        v        v
                          SQLite    ML/AI    Weather
                          Data      Logic    Service

          APIs return data to the frontend
                   |
                   v
        Dashboards and Predictions
```

### How the project works

1. A user opens the application and accesses the appropriate dashboard.
2. The frontend sends HTTP requests to the relevant backend service.
3. The Node.js backend handles its API routes, authentication, authorization, and campus-management operations.
4. MongoDB stores data managed by the Node.js application.
5. The Python FastAPI backend handles campus-data processing and the implemented prediction, health-assessment, and related analytical endpoints.
6. SQLite is used by the Python service for configured campus and environmental reading storage.
7. The weather service retrieves environmental information using the configured weather API.
8. The frontend displays the responses in the appropriate screens.

The two backend services must be configured with the correct addresses and run when their respective functionality is required.

---

## 🧰 Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React Native, Expo, TypeScript |
| Navigation | Expo Router |
| Node.js backend | Node.js, Express.js |
| Python backend | Python, FastAPI, Uvicorn |
| Database — Node.js | MongoDB, Mongoose |
| Database — Python | SQLite |
| Authentication | JWT, bcryptjs |
| API communication | HTTP, JSON, Fetch API |
| AI/ML | Python-based prediction and anomaly-analysis components |
| Weather integration | Configured WeatherAPI service |
| Frontend deployment | Vercel |
| Version control | Git, GitHub |

---

## 📁 Project Structure

The main project components are organized as follows:

```text
smart-campus-digital-twin/
│
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── app.py
│   ├── database.py
│   ├── weather_service.py
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── ... supporting files, data and models
│
├── mobile/
│   ├── src/
│   │   ├── app/
│   │   │   ├── student-dashboard.tsx
│   │   │   ├── faculty-dashboard.tsx
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── maintenance-dashboard.tsx
│   │   │   ├── occupancy-prediction.tsx
│   │   │   ├── energy-prediction.tsx
│   │   │   ├── anomaly-detection.tsx
│   │   │   ├── campus-health-score.tsx
│   │   │   ├── ai-recommendations.tsx
│   │   │   ├── what-if-simulation.tsx
│   │   │   └── ...
│   │   └── constants/
│   │       └── api.ts
│   └── package.json
│
├── .gitignore
└── README.md
```

*This is a representative structure of the primary components; supporting files and subdirectories are omitted.*

---

## 🚀 Getting Started

### Prerequisites

Install or configure the following before running the project locally:

- Node.js and npm.
- Python and pip.
- MongoDB Atlas or another compatible MongoDB deployment.
- A configured weather API key if live weather functionality is required.
- Git.
- Expo-compatible development environment.

### 1. Clone the repository

```bash
git clone https://github.com/Yashaswini-2006-4/smart-campus-digital-twin.git

cd smart-campus-digital-twin
```

### 2. Configure the Node.js backend

Open a terminal:

```bash
cd backend
npm install
```

Create or update `backend/.env` with the required configuration. At minimum, the Node.js database connection uses `MONGO_URI`.

```env
MONGO_URI=your_mongodb_connection_string
```

Configure any additional authentication and weather-related environment variables required by the source code. Keep actual credentials private.

Start the Node.js backend:

```bash
npm run dev
```

The development server runs at:

`http://localhost:5000`

The root endpoint can be opened in a browser to verify that the API server is responding.

### 3. Configure the Python backend

Open another terminal:

```bash
cd backend
```

Create a virtual environment if required:

```bash
python -m venv venv
```

Activate it in Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the Python dependencies listed in the backend's requirements file, if provided:

```bash
pip install -r requirements.txt
```

Start the FastAPI service:

```bash
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The Python backend should now be available at:

- API health endpoint: `http://localhost:8000/health`
- Interactive API documentation: `http://localhost:8000/docs`

The exact endpoints available can be inspected in the interactive API documentation.

### 4. Start the mobile/web frontend

Open another terminal:

```bash
cd mobile
npm install
npx expo start
```

Use the Expo development server to run the application on a supported device or browser. To start the web version directly, use:

```bash
npx expo start --web
```

Keep the required backend services running while testing features that depend on their APIs.

---

## 🔌 API Configuration

The frontend must point to the correct backend address.

For example, `mobile/src/constants/api.ts` contains the `API_BASE_URL` used by screens that import it.

A typical local configuration is:

```typescript
export const API_BASE_URL = 'http://YOUR_LAPTOP_IP:8000';
```

Replace `YOUR_LAPTOP_IP` with the laptop's current LAN IPv4 address when testing from a physical phone.

Some screens may define their own API URL. Confirm that those URLs also point to the appropriate backend.

### Important deployment note

The deployed frontend is available at:

**https://smart-campus-digital-twin-mobile.vercel.app**

A frontend deployed on Vercel cannot directly reach a backend running only on a developer's laptop or a private address such as `192.168.x.x`.

For the public deployment to provide live data, configure the frontend to use publicly reachable backend API URLs, configure backend CORS appropriately, and ensure the required services and databases are available. The frontend deployment URL does not by itself establish that both backends are publicly deployed.

---

## 🧪 Testing and Verification

The following checks can be used during development:

### Node.js backend

- Confirm the server starts without errors.
- Verify that MongoDB connects successfully.
- Test registration and login.
- Verify authenticated and unauthorized API requests.
- Test authorized campus-management and operational endpoints.

### Python backend

- Open `/docs` to review available endpoints.
- Open `/health` and inspect the returned campus health data.
- Test `/environment` for environmental information.
- Test the occupancy and other analytical endpoints documented by the application.
- Verify that required input data, database records, and models are available.

### Frontend

- Test login and registration.
- Check navigation to the correct role dashboard.
- Confirm that dashboard requests return real API data.
- Test prediction, anomaly, health-score, recommendation, and simulation screens.
- Verify loading indicators and error messages.
- Test on both a local browser and a physical phone where applicable.

A screen displaying correctly does not, by itself, prove that its backend integration is working. Confirm its API responses and data persistence during testing.

---

## 🔒 Security and Configuration

- Never commit passwords, private API keys, or database connection strings.
- Keep `.env` files excluded from Git.
- Configure JWT secrets securely.
- Use role-based authorization on protected backend routes.
- Validate and sanitize user input.
- Restrict database permissions to the application's requirements.
- Configure production CORS rules for trusted frontend origins.
- Use HTTPS for publicly deployed API services.
- Do not rely solely on hiding frontend buttons for access control; enforce permissions on the backend.

---

## 🛠️ Troubleshooting

### MongoDB connection fails

Check that `MONGO_URI` exists in the backend's local `.env`, that the connection string is valid, and that the database user and Atlas network access are configured correctly.

### Campus health or occupancy data does not load

Check that the Python backend is running, verify the relevant endpoint using `/docs`, and confirm that the frontend uses the correct base URL.

### Phone cannot connect to the backend

Use the laptop's current LAN IPv4 address instead of `localhost`. Ensure both devices can communicate over the network, the Python server accepts connections on the required interface, and Windows Firewall permits the connection.

### Live weather is unavailable

Check the weather API key, service configuration, available internet access, and the error returned by the environment endpoint.

### The deployed frontend opens but displays unavailable data

Confirm that the deployed frontend is not using a private LAN IP or localhost address. Public use requires the frontend to point to reachable backend deployments.

---

## 👥 Team Collaboration

The project is developed collaboratively using Git and GitHub. Contributors work on separate branches, implement their assigned components, and merge changes into the main branch for integration and testing.

The project combines campus-management APIs, mobile/web application screens, and AI/ML functionality into one application.

---

## 🎯 Project Objectives

- Provide a unified digital view of campus operations.
- Support role-specific access to campus information and management functions.
- Improve campus resource and maintenance visibility.
- Use data-driven predictions to understand occupancy and energy usage.
- Detect unusual conditions and present useful recommendations.
- Assess overall campus conditions through a health score.
- Explore possible campus changes through what-if simulations.
- Provide an extensible foundation for future campus IoT integration and intelligent operations.

---

## 🌐 Project Links

- **Live Frontend:** https://smart-campus-digital-twin-mobile.vercel.app
- **GitHub Repository:** https://github.com/Yashaswini-2006-4/smart-campus-digital-twin

---

**Smart Campus Digital Twin**  
*Making campus operations more visible, connected, and intelligent through digital technologies.*
