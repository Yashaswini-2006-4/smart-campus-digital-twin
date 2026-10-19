
# Smart Campus Digital Twin — Website Feature Guide

## Student Dashboard

The student dashboard shows campus status, occupancy, energy readings, campus temperature, campus health, AI predictions, outdoor weather, and AI recommendations. It provides links to the campus digital twin, campus complaints, anomaly detection, and campus health score. The dashboard also supports refresh and logout.

## Campus Digital Twin

The Campus Digital Twin is the entry point for exploring campus information. The student dashboard links to buildings, departments, rooms, and facilities through the digital-twin feature.

## Buildings

The buildings screen is available as `/buildings`. Use it to access the building-related functionality implemented in the application. If a question depends on a specific building record or field, use the actual application data rather than inventing a value.

## Departments

The departments screen is available as `/departments`. It contains the department-related interface implemented in the application.

## Rooms

The rooms screen is available as `/rooms`. Questions about an exact room, room number, or room availability must be answered from stored application data when available.

## Facilities

The facilities screen is available as `/facilities`. It provides the facilities-related functionality implemented in the application.

## Campus Complaints

The campus complaints screen is available as `/complaints`. The student dashboard describes it as a way to report campus problems and follow their status. Refer students to this screen when they ask how to report a campus problem.

## Campus Maintenance

The campus maintenance screen is available as `/campus-maintenance`. Related screens include `/maintenance-dashboard` and `/maintenance-tasks`. Use the implemented maintenance workflows for specific task status or assignment questions.

## Faculty Dashboard

The faculty dashboard is available as `/faculty-dashboard`. Account access depends on the role assigned to the authenticated user's account.

## Admin Dashboard

The admin dashboard is available as `/admin-dashboard`. Administrative access must depend on the account's assigned role and backend authorization. Never instruct users to grant themselves administrator privileges.

## Maintenance Dashboard

The maintenance dashboard is available as `/maintenance-dashboard`. Maintenance users must sign in using an account assigned the maintenance role. Questions about specific tasks must use actual stored records.

## Live Campus Data

The live campus data screen is available as `/live-campus-data`. The interface distinguishes outdoor weather from manually entered campus readings. Do not describe an outdoor weather observation as an indoor campus sensor reading.

## Occupancy Prediction

The occupancy prediction screen is available as `/occupancy-prediction`. The dashboard displays current and predicted occupancy when that data is available from the backend.

## Energy Prediction

The energy prediction screen is available as `/energy-prediction`. The dashboard displays current and predicted energy when that data is available from the backend.

## Campus Health Score

The campus health screen is available as `/campus-health-score`. The dashboard displays a campus health score, status, and insight when returned by the backend. Explain the recorded insight instead of inventing a reason for a low score.

## Anomaly Detection

The anomaly detection screen is available as `/anomaly-detection`. Use live anomaly results returned by the backend for questions about detected anomalies. Do not invent anomalies or claim that a normal result is an alert.

## AI Recommendations

The AI recommendations screen is available as `/ai-recommendations`. The dashboard presents recommendation summaries, priority, messages, and suggested actions when provided by the backend.

## What-If Simulation

The what-if simulation screen is available as `/what-if-simulation`. Explain the simulation only according to the implemented feature and returned data. Do not present a hypothetical result as a real campus measurement.

## Chatbot

The chatbot screen is available as `/chatbot`. This assistant uses the campus knowledge base, structured timetable records, and connected live endpoints. It should state when a requested record or capability is unavailable rather than making up an answer.

## Login and Role Selection

Public registration creates student accounts. The available roles are student, faculty, admin, and maintenance. The backend must enforce the role assigned to each account. A user must not be able to acquire a more privileged role merely by selecting it in the interface.

## Timetable Knowledge

The initial structured timetable covers Navkis College of Engineering, Computer Science and Engineering, Semester VII, Section B, Odd Semester 2026-27. It is stored in `timetable_semester_vii_b_2026_27.json`. Do not apply this schedule to another semester, section, or branch unless the relevant timetable has been added.

## Air Quality Index

The Air Quality Index feature is not considered live until the backend weather integration returns actual AQI or pollutant fields. Do not estimate an AQI from temperature, humidity, or weather descriptions. The chatbot should identify the index standard used and only report values that the connected provider returns.
