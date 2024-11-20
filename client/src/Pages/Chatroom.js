import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Form, Button, ListGroup } from 'react-bootstrap';
import { AuthContext } from '../Context/AuthProvider';
import axios from 'axios';
import config from '../config';

export default function ChatRoom() {
    const [inputValue, setInputValue] = useState('');
    const [userlist, setUserlist] = useState([]);
    const [messages, setMessages] = useState([]);
    const [receiverId, setReceiverId] = useState(null);
    const [receiverName, setReceiverName] = useState('');
    const { userName, userId, accessToken } = useContext(AuthContext);
    const [checkId, setCheckId] = useState([])


    //for user list
    const fetchUserList = async () => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/getUser?userId=${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setUserlist(response.data);
        } catch (error) {
            console.error("Error fetching user list", error);
        }
    };
    

    //for message list
    const fetchMessages = async (userId, receiverId) => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/getMessages`, {
                params: {
                    userId: userId,
                    otherUserId: receiverId
                }
            });
            setMessages(response.data);  
        } catch (error) {
            console.error("Error fetching messages", error);
        }
    };
    

    const handleUserClick = (user) => {
        setReceiverId(user.user_id);
        setReceiverName(user.user_name);
        setInputValue('');
        fetchMessages(userId, user.user_id);
        setCheckId(user.user_id);


    };


    useEffect(() => {
        fetchUserList(userId);
        const eventSource = new EventSource(`${config.apiUrl}/chat/streamMessages?userId=${userId}`);
        eventSource.onmessage = function (event) {
            const newMessage = JSON.parse(event.data);

            if(newMessage.sender_id === checkId && newMessage.receiver_id === parseInt(userId, 10)){
            
                if (newMessage.receiver_id === parseInt(userId, 10) || newMessage.sender_id === parseInt(userId, 10)) {
                        setMessages((prevMessages) => {
                            return [...prevMessages, newMessage];
                        });
                    }
            } else if (newMessage.sender_id === parseInt(userId, 10)) {
                setMessages((prevMessages) => [...prevMessages, newMessage]);
            }
        };
        return () => {
            eventSource.close();
        };
    }, [userId, receiverId]);
    
 
 
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!receiverId) {
            alert('Please select a user to send a message to.');
            return;
        }        
        const payload = {
            senderId: parseInt(userId, 10),
            receiverId,
            content: inputValue,
        };
        try {
            await axios.post(`${config.apiUrl}/chat/addMessage`, payload);
            setInputValue('');
        } catch (error) {
            console.error("Error sending message", error);
        }
    };
    


    return (
        <Container className="py-4">
            <Row className="flex-grow-1">
                {/* User List Section */}
                <Col md={4} className="d-flex flex-column">
                    <h3 className="mb-3 p-2" >{userName}</h3>
                    <ListGroup variant="flush" className="overflow-auto" style={{ height: '400px' }}>
                        {userlist.length > 0 ? (
                            userlist.map((user) => (
                                <ListGroup.Item
                                    key={user.user_id}
                                    className={`cursor-pointer ${receiverId === user.user_id ? 'bg-primary text-white' : ''}`}
                                    onClick={() => handleUserClick(user)}
                                >
                                    {user.user_name}
                                </ListGroup.Item>
                            ))
                        ) : (
                            <ListGroup.Item>No users found</ListGroup.Item>
                        )}
                    </ListGroup>
                </Col>

                {/* Chat Section */}
                <Col md={8} className="d-flex flex-column">
                    {receiverName && (
                        <div className="mb-2">
                            <strong>{receiverName}</strong>
                        </div>
                    )}

                    <div className="flex-grow-1 overflow-auto border border-light rounded p-3 mb-2" style={{ height: '400px' }}>
                        {messages.length > 0 ? (
                            messages.map((msg) => (
                                <div
                                    key={msg.message_id}
                                    className={`d-flex mb-2 ${msg.sender_id === parseInt(userId, 10) ? 'justify-content-end' : 'justify-content-start'}`}
                                >
                                    <div className="message-bubble">
                                        <strong>
                                            {msg.sender_id === parseInt(userId, 10) ? 'You' : msg.user_name}:
                                        </strong>{' '}
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div>No messages yet.</div>
                        )}
                    </div>
                    {/* Message Input */}
                    <Form onSubmit={handleSendMessage} className="bg-light">
                        <Form.Group>
                            <Form.Control
                                type="text"
                                placeholder="Type a message..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Button type="submit" variant="success" disabled={!receiverId || !inputValue}>
                            Send
                        </Button>
                    </Form>
                </Col>
            </Row>
        </Container>
    );
}
