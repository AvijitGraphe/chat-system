import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(() => sessionStorage.getItem('userId'));
  const [userName, setUserName] = useState(() => sessionStorage.getItem('userName'));
  const [accessToken, setAccessToken] = useState(sessionStorage.getItem('accessToken'));
  
  useEffect(() => {
    sessionStorage.setItem('userId', userId || '');
    sessionStorage.setItem('userName', userName || '');
    sessionStorage.setItem('accessToken', accessToken || '');
  }, [userId, userName, accessToken]);

  const login = (data) => {
    setUserId(data.userId);
    setUserName(data.userName);
    setAccessToken(data.accessToken);
  };

  const logout = () => {
    setUserId(null);
    setUserName(null);
    setAccessToken(null);
    sessionStorage.clear(); 
  };

  return (
    <AuthContext.Provider value={{ accessToken, userName, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
