import React from 'react';
import Login from './Auth/Login';
import SignUp from './Auth/SingUp';
import Chatroom from './Pages/Chatroom';


import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Message from './Pages/Message';

function App() {
  return (
    <div>
      <Router>
        <Routes>
          {/* <Route path="/" element={<SignUp />} /> */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/" element={<Login />} /> 
          <Route path="/login" element={<Login />} /> 
          {/* <Route path='/chat' element={<Chatroom />} /> */}
          <Route path='/message' element={<Message />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
