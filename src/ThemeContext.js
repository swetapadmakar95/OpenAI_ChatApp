import React, { createContext, useState, useContext } from 'react';

// Default light theme
const defaultTheme = {
  background: '#fff',
  color: '#000',
  botBubbleColor: '#e1f5fe',
  userBubbleColor: '#bbdefb',
};

// Dark theme
const darkTheme = {
  background: '#333',
  color: '#fff',
  botBubbleColor: '#455a64',
  userBubbleColor: '#90a4ae',
};
const ThemeContext = createContext();
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(defaultTheme);

  const toggleTheme = () => {
    setTheme(theme === defaultTheme ? darkTheme : defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useTheme = () => useContext(ThemeContext);
