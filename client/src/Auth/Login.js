import React, { useState, useContext } from "react";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";
import config from "../config";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../Context/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resp = await axios.post(`${config.apiUrl}/api/login`, {
        email,
        password,
      });
      if (resp.status === 201) {
        setLoginError(""); 
        login(resp.data); 
        navigate('/message'); 
      } else {
        setLoginError("Invalid credentials");
      }
    } catch (error) {
      console.error(error);
      setLoginError("Invalid credentials");
    }
  };

  return (
    <Container
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh" }}
    >
      <Row className="w-100">
        <Col md={6} sm={12} className="p-4 bg-light rounded shadow">
          <h2 className="text-center mb-4">Login</h2>

          {/* Show error message if exists */}
          {loginError && <Alert variant="danger">{loginError}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formEmail" className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="formPassword" className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100 mt-3">
              Login
            </Button>

            <div className="mt-3 text-center">
              Don't have an account?{" "}
              <Link to="/signup">Sign up here</Link>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}
