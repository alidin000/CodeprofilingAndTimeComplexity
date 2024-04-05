// Header.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const Header = ({ isLoggedIn, handleLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header>
      <div className="logo">LOGO</div>
      <nav>
        <ul>
          {currentPath === '/learning' ? (
            <>
              <li>
                <NavLink to="/calculator" activeClassName="active" exact className="link-style">
                  CALCULATOR
                </NavLink>
              </li>
            </>
          ) : (
            <li>
              <NavLink to="/learning" activeClassName="active" exact className="link-style">
                LEARNING
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/about-us" activeClassName="active" className="link-style">
              ABOUT US
            </NavLink>
          </li>
          {isLoggedIn ? (
            <li>
              <button onClick={handleLogout} className="link-style">
                Logout
              </button>
            </li>
          ) : (
            <>
              <li>
                <NavLink to="/login" activeClassName="active" className="link-style">
                  Login
                </NavLink>
              </li>
              <li>
                <NavLink to="/signup" activeClassName="active" className="link-style">
                  Sign Up
                </NavLink>
              </li>
            </>
          )}
        </ul>
        {isLoggedIn && (
        <div className="user-icon">
          {/* Use Font Awesome user icon */}
          <i className="fas fa-user"></i>
        </div>
      )}
      </nav>
    </header>
  );
};

export default Header;
