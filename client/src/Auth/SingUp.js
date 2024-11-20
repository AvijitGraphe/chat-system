import { useState } from "react";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";
import config from "../config";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function SignUp() {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if passwords match before sending the request
    if (password !== confirmPassword) {
      setLoginError("Passwords do not match!");
      return;
    }

    try {
      const resp = await axios.post(`${config.apiUrl}/api/signup`, {
        user_name: userName,
        email: email,
        password: password,
      });

      // On success, navigate to the login page
      navigate("/login");
    } catch (error) {
      console.error("Error during signup:", error.response?.data || error.message);
      setLoginError(error.response?.data || "An error occurred during signup.");
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center vh-100">
      <Row className="w-100">
        <Col md={6} className="p-4 bg-light rounded shadow">
          <h2 className="text-center mb-4">Sign Up</h2>

          {/* Show error message if exists */}
          {loginError && (
            <Alert variant="danger">
              {loginError}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formUserName" className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </Form.Group>

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

            <Form.Group controlId="formConfirmPassword" className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100 mt-3">
              Sign Up
            </Button>

            <div className="mt-3 text-center">
              Already have an account?{" "}
              <Link to="/login">Login here</Link>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}
