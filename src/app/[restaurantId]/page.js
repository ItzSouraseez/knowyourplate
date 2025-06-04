"use client";

import { useState, useEffect, useRef } from 'react';
import { use } from 'react';
import { getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, provider } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

export default function Menu({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const { restaurantId } = params;
  const [user, setUser] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [sections, setSections] = useState([]);
  const [foods, setFoods] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const contentRefs = useRef({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && restaurantId) {
        fetchMenu(restaurantId);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [restaurantId]);

  const fetchMenu = async (uid) => {
    try {
      console.log('Fetching menu for restaurant:', uid);
      // Fetch restaurant name
      const restaurantDoc = await getDoc(doc(db, 'restaurants', uid));
      if (!restaurantDoc.exists()) {
        throw new Error('Restaurant not found');
      }
      setRestaurantName(restaurantDoc.data().restaurantName || 'Unnamed Restaurant');

      // Fetch sections and food items
      const sectionsSnapshot = await getDocs(collection(db, 'restaurants', uid, 'sections'));
      const sectionList = [];
      const foodMap = {};
      const initialCollapsed = {};

      for (const sectionDoc of sectionsSnapshot.docs) {
        const sectionId = sectionDoc.id;
        const sectionName = sectionDoc.data().name;
        sectionList.push(sectionName);
        initialCollapsed[sectionName] = false;
        console.log('Processing section:', sectionId, 'Name:', sectionName);

        const foodItemsSnapshot = await getDocs(
          collection(db, 'restaurants', uid, 'sections', sectionId, 'foodItems')
        );
        foodMap[sectionName] = foodItemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Found ${foodMap[sectionName].length} items in section ${sectionName}`);
      }

      setSections(sectionList);
      setFoods(foodMap);
      setCollapsedSections(initialCollapsed);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu:', error);
      setError('Failed to load menu. Please try again later.');
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
      setRestaurantName('');
      setSections([]);
      setFoods({});
      setCollapsedSections({});
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to sign out.');
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      {user ? (
        <>
          <div className="header">
            <span>Welcome, {user.displayName}</span>
            <button onClick={handleLogout} className="button">Logout</button>
          </div>
          <h1>{restaurantName} Menu</h1>
          {error && <p className="error">{error}</p>}
          <div className="food-list">
            {sections.length === 0 ? (
              <p>No menu items available.</p>
            ) : (
              sections.map(section => (
                <div key={section} className="section">
                  <h2 
                    className="section-header" 
                    onClick={() => toggleSection(section)}
                    role="button"
                    aria-expanded={!collapsedSections[section]}
                    aria-controls={`section-${section}`}
                  >
                    <span className="toggle-icon">
                      {collapsedSections[section] ? '▶' : '▼'}
                    </span>
                    {section}
                  </h2>
                  <div
                    id={`section-${section}`}
                    className={`section-content ${collapsedSections[section] ? 'collapsed' : ''}`}
                    ref={el => (contentRefs.current[section] = el)}
                    style={{
                      height: collapsedSections[section]
                        ? '0'
                        : `${contentRefs.current[section]?.scrollHeight || 'auto'}px`
                    }}
                  >
                    {foods[section]?.length > 0 ? (
                      <div className="food-grid">
                        {foods[section].map(food => (
                          <div key={food.id} className="food-item">
                            {food.images && food.images.length > 0 ? (
                              <div className="carousel-container">
                                <Carousel showThumbs={false} showStatus={true} infiniteLoop autoPlay interval={3000}>
                                  {food.images.map((url, index) => (
                                    <div key={index} className="carousel-image-wrapper">
                                      <img src={url} alt={`${food.name} ${index}`} />
                                    </div>
                                  ))}
                                </Carousel>
                              </div>
                            ) : (
                              <div className="no-image">No Images</div>
                            )}
                            <h3>{food.name}</h3>
                            <p><strong>Price:</strong> ${food.price || 'N/A'}</p>
                            <p><strong>Ingredients:</strong> {food.ingredients || 'N/A'}</p>
                            <p><strong>Calories:</strong> {food.calories || 'N/A'} kcal</p>
                            <p><strong>Protein:</strong> {food.protein || 'N/A'}g</p>
                            <p><strong>Carbs:</strong> {food.carbs || 'N/A'}g</p>
                            <p><strong>Fat:</strong> {food.fat || 'N/A'}g</p>
                            <p><strong>Vitamins:</strong> {food.vitamins || 'N/A'}</p>
                            <p><strong>Allergens:</strong> {food.allergens || 'N/A'}</p>
                            <button className="order-button">Order</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No items in {section} section.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <h1>Restaurant Menu</h1>
          <button onClick={handleLogin} className="button">Sign in with Google</button>
        </>
      )}
    </div>
  );
}