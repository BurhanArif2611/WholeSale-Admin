# WholeSale Admin

A modern, AI-powered wholesale management application built with Expo and React Native. This app streamlines the process of managing orders, clients, and products for wholesale businesses, featuring a powerful voice command interface driven by Google's Gemini AI.

## 🚀 Features

- **Order Management**: Create, track, and manage wholesale orders with ease.
- **Client Directory**: Keep track of your business clients and their history.
- **Product Catalog**: Manage your inventory and product details.
- **AI Voice Commands**: Place orders, add clients, and search products using natural language voice commands.
- **Multi-Role Support**: Tailored experiences for both Salesmen and Business Owners.
- **Offline-First Capabilities**: robust synchronization with Supabase for reliable data management.
- **Modern UI**: A premium, responsive interface designed for high-density professional use.

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **AI Integration**: [Google Gemini AI](https://ai.google.dev/) (`@google/generative-ai`)
- **State Management**: React Hooks & Supabase Realtime
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Voice Recognition**: `expo-speech-recognition`

## 📦 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn
- [Expo Go](https://expo.dev/expo-go) app on your mobile device (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wholesale-expo/wholesale-admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (see [Environment Variables](#-environment-variables)).

### Running the App

- **Start Development Server**:
  ```bash
  npm start
  ```
- **Run on Android**:
  ```bash
  npm run android
  ```
- **Run on iOS**:
  ```bash
  npm run ios
  ```
- **Run on Web**:
  ```bash
  npm run web
  ```

## 🔑 Environment Variables

Create a `.env` or `.env.local` file in the root of the `wholesale-admin` directory with the following keys:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_google_gemini_api_key
```

## 🧪 Testing

The project uses Jest for unit and integration testing.

```bash
npm test
```

## 🎓 Academic Correlation

This project serves as a practical implementation of several core concepts in Computer Science and Software Engineering:

### 1. Distributed Systems & Data Consistency
- **Concept**: Eventual Consistency vs. Strong Consistency.
- **Application**: The app's offline-first synchronization strategy using Supabase and local storage addresses the **CAP Theorem**, prioritizing Availability and Partition Tolerance while managing data reconciliation during sync.

### 2. Human-Computer Interaction (HCI)
- **Concept**: Multi-modal Interfaces and Voice User Interfaces (VUI).
- **Application**: Integration of **AI-driven voice commands** explores the efficiency of non-traditional input methods in professional high-density data environments, focusing on reducing cognitive load and improving accessibility.

### 3. Artificial Intelligence & NLP
- **Concept**: Structured Data Extraction from Unstructured Text.
- **Application**: Utilizing **Large Language Models (Gemini AI)** for intent classification and entity recognition demonstrates the transition from traditional rule-based parsers to probabilistic, context-aware AI agents in mobile applications.

### 4. Software Engineering Paradigms
- **Concept**: Reactive Programming and Component-Based Architecture.
- **Application**: The use of **React Native's declarative UI** and hook-based state management illustrates the modern approach to building scalable, cross-platform mobile systems with a focus on separation of concerns.

### 5. Database Systems & Security
- **Concept**: Relational Integrity and Row-Level Security (RLS).
- **Application**: Implementing **Supabase RLS** mirrors academic principles of Zero Trust Architecture and least-privilege access in cloud-managed database environments.

## 📄 License

This project is private and intended for authorized use only.
