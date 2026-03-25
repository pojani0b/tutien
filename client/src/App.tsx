import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useGameStore } from './store/useGameStore';
import { useRealtime } from './hooks/useRealtime';

// Pages
import TosPage from './pages/TosPage';
import AuthPage from './pages/AuthPage';
import ServerSelectPage from './pages/ServerSelectPage';
import SaveSlotPage from './pages/SaveSlotPage';
import CharacterCreatePage from './pages/CharacterCreatePage';
import RollPage from './pages/RollPage';
import StatAllocPage from './pages/StatAllocPage';
import GamePage from './pages/GamePage';
import NotificationToast from './components/NotificationToast';

export default function App() {
  const { auth, tosAccepted, activeCharacter } = useGameStore();
  useRealtime(); // Connect to Supabase Realtime once character is set

  return (
    <>
      <NotificationToast />
      <Routes>
        {/* TOS — always shown first */}
        <Route path="/tos" element={<TosPage />} />

        {/* Auth */}
        <Route
          path="/auth"
          element={
            !tosAccepted ? <Navigate to="/tos" /> :
            auth.token ? <Navigate to="/servers" /> :
            <AuthPage />
          }
        />

        {/* Server select */}
        <Route
          path="/servers"
          element={
            !tosAccepted ? <Navigate to="/tos" /> :
            !auth.token ? <Navigate to="/auth" /> :
            <ServerSelectPage />
          }
        />

        {/* Save slots */}
        <Route
          path="/server/:serverId/slots"
          element={
            !tosAccepted ? <Navigate to="/tos" /> :
            !auth.token ? <Navigate to="/auth" /> :
            <SaveSlotPage />
          }
        />

        {/* Character creation flow */}
        <Route
          path="/server/:serverId/create/:slotIndex"
          element={!auth.token ? <Navigate to="/auth" /> : <CharacterCreatePage />}
        />
        <Route
          path="/roll"
          element={!auth.token ? <Navigate to="/auth" /> : <RollPage />}
        />
        <Route
          path="/alloc"
          element={!auth.token ? <Navigate to="/auth" /> : <StatAllocPage />}
        />

        {/* Main game */}
        <Route
          path="/game"
          element={
            !auth.token ? <Navigate to="/auth" /> :
            !activeCharacter ? <Navigate to="/servers" /> :
            <GamePage />
          }
        />

        {/* Root redirect */}
        <Route
          path="/"
          element={
            !tosAccepted ? <Navigate to="/tos" /> :
            !auth.token ? <Navigate to="/auth" /> :
            <Navigate to="/servers" />
          }
        />
      </Routes>
    </>
  );
}
