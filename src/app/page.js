"use client";

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, provider } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchRestaurants();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRestaurants = async () => {
    try {
      console.log('Fetching restaurants');
      const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
      const restaurantList = restaurantsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().restaurantName || 'Unnamed Restaurant'
      }));
      setRestaurants(restaurantList);
      setLoading(false);
      console.log('Restaurants:', restaurantList);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError('Failed to load restaurants. Please try again later.');
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to sign in.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRestaurants([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to sign out.');
    }
  };

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Available Restaurants</h1>
      {error && <p className="error">{error}</p>}
      {user ? (
        <>
          <div className="header">
            <span>Welcome, {user.displayName}</span>
            <button onClick={handleLogout} className="button">Logout</button>
          </div>
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants by name..."
              className="search-input"
            />
          </div>
          <div className="restaurant-list">
            {filteredRestaurants.length === 0 ? (
              <p>No restaurants found.</p>
            ) : (
              filteredRestaurants.map(restaurant => (
                <Link 
                  href={`/${restaurant.id}`} 
                  key={restaurant.id} 
                  className="restaurant-card"
                >
                  <h2>{restaurant.name}</h2>
                  <p>ID: {restaurant.id}</p>
                </Link>
              ))
            )}
          </div>
        </>
      ) : (
        <button onClick={handleLogin} className="button">Sign in with Google</button>
      )}
    </div>
  );
}