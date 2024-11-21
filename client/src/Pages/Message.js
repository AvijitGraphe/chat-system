import React, { useState, useEffect, useContext, useRef } from "react";
import { Container, Row, Col, Form, ListGroup } from "react-bootstrap";
import { AuthContext } from "../Context/AuthProvider";
import axios from "axios";
import config from "../config";
import io from "socket.io-client";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { MultiSelect } from "primereact/multiselect";
import { Card } from "primereact/card";
import { FiPaperclip } from 'react-icons/fi'; 
import { FiX } from 'react-icons/fi';


export default function Message() {
  const [inputValue, setInputValue] = useState("");
  const [userlist, setUserlist] = useState([]);
  const [messages, setMessages] = useState([]);
  const [receiverId, setReceiverId] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const { userName, userId, accessToken } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState(""); 
  const [selectedUsers, setSelectedUsers] = useState([]); 
  const [groups, setGroups] = useState([]);
  const [groupShow, setGroupShow] = useState(false);
  const [showGroupName, setShowGroupName] = useState("");
  const [show, setShow] = useState(false); 
  const [anotherCondition, setAnotherCondition] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState([]);
  const [getGroupId, setGetGroupId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [checkId, setCheckId] = useState(null);
  const [isShow, setIsShow] = useState(false);
  const [file, setFile] = useState([]);  // Ensure file is an array, not null


 const fileUrl ="http://localhost:5000/routes/uploads"


  // Fetch user list from the API
  const fetchUserList = async () => {
    try {
      const response = await axios.get(
        `${config.apiUrl}/api/getUser?userId=${userId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setUserlist(response.data);
    } catch (error) {
      console.error("Error fetching user list", error);
    }
  };




  const handleUserClick = (user) => {
    // Reset group-related data
    setIsShow(true);
    setGetGroupId(null);
    setShowGroupName("");
    setSelectedGroup([]);
    // Set user-specific data
    setReceiverId(user.user_id);
    setReceiverName(user.user_name);
    setInputValue(""); 
    fetchMessages(userId, user.user_id);
    setShow(true); 
    setCheckId(user.user_id)
  };
  
  // Fetch chat messages from the server
  const fetchMessages = async (userId, receiverId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/getMessages`, {
        params: { userId, otherUserId: receiverId },
      });
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages", error);
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const socketUrl = `${protocol}${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
    
    const newSocket = io(socketUrl, {
      query: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,  
      reconnectionDelayMax: 5000, 
      auth: { token: accessToken },  
    });
    setSocket(newSocket);
    newSocket.on("connect", () => {
    });
    newSocket.on("connected", (data) => {
    });
    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);
  
  

useEffect(() => {
    if (socket) {
        const handleReceiveMessage = (newMessage) => {
            if (newMessage && parseInt(newMessage.sender_id, 10) === parseInt(checkId, 10)) {
                if (newMessage.receiver_id === parseInt(userId, 10)) {
                    setMessages((prevMessages) => [...prevMessages, newMessage]);
                } else {
                    console.log("Message doesn't belong to the current user.");
                }
            }
        };
        socket.on("receiveMessage", handleReceiveMessage);
        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
        };
    }
}, [socket, userId, checkId]);




//for sender message
useEffect(() => {
    if (socket) {
        const senderMessage = (newMessage) => {
            setMessages((prevMessages) => [...prevMessages, newMessage]);
        };
        socket.on("senderMessage", senderMessage);
        return () => {
            socket.off("senderMessage", senderMessage);
        };
    }
}, [socket, userId]);

  


  useEffect(() => {
    fetchUserList();
    handleShowGroups(userId);
  }, [userId]);
  const handleGroupCreate = async () => {
    setShowCreateGroup(true); 
  };
  const handleCloseDialog = () => {
    setShowCreateGroup(false);
    setSelectedUsers([]);
    setGroupName("");
  };
  


   //create group lists
  const handleCreateGroup = async() => {
    if (!groupName || selectedUsers.length === 0) {
      alert("Please enter a group name and select at least one user.");
      return;
    }
    const payload = {
      groupName: groupName,
      selectedUsers: selectedUsers,
      userId: userId,
    };
    const response = await axios.post(`${config.apiUrl}/api/createGroup`, payload);
    setSelectedUsers([]);
    setGroupName("");
    setShowCreateGroup(false); 
    handleShowGroups(userId)
  };

   //show all groups list
   const handleShowGroups = async (userId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/getGroups`, {
        params: { userId: userId },
      });      
      setGroups(response.data);
    } catch (error) {
      console.error("Error fetching groups", error);
    }
  };





  // Handle group click
    const handleGroupClick = async (group) => {
      try {
            setIsShow(true);
            setGetGroupId(group.group_id);
            setCurrentGroupId(group.group_id);
            setShowGroupName(group.group_name);
            setShow(false)
            setAnotherCondition(true);
            setMessages([]);
            setReceiverName([]);

            handleGetGroupMessages(group.group_id);
            
            const response = await axios.get(`${config.apiUrl}/api/getGroupMembers`, {
                params: { groupId: group.group_id },
            });
            if (response.status === 200) {    
                setSelectedGroup(response.data);
                handleJoinGroup(group.group_id);
              } else {
                console.error("Failed to fetch group members", response);
              }
      } catch (error) {
        console.error("Error fetching group members", error);
      }
    };
   

    

  // ALL THE MESSAGES ARE SENT HERE
  //Hear all emmit system...
  
  //message send emmit
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!receiverId || !inputValue) {
      alert("Please select a user and type a message.");
      return;
    }
    const payload = {
      senderId: userId,
      receiverId,
      content: inputValue,
      files: Array.isArray(file) && file.length > 0 ? file.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        data: f // You might need to adjust this depending on your backend's file handling
      })) : [], // Empty array if no files
    };
    try {
      if (socket) {
        socket.emit("sendMessage", payload);
      }
      setInputValue("");
      setFile([]); 
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

    const handleJoinGroup = (groupId) => {
        if (socket) {
            socket.emit('joinGroup', groupId); // Emit the join group event
        }
    };

    const handleLeaveGroup = (groupId) => {
        if (socket) {
            socket.emit('leaveGroup', groupId); // Emit the leave group event
        }
    };
    

    //message send emmit..
    // const handleSendGroupMessage = async (e) => {
    //     e.preventDefault();
    //     if (!getGroupId || !inputValue) {
    //         alert("Please select a user and type a message.");
    //         return;
    //     }
    //     const payload = {
    //         senderId: userId,
    //         group_id: getGroupId,
    //         content: inputValue,
    //     };

        
    //     try {
    //         if (socket) {
    //             socket.emit("sendGroupMessage", payload);
    //         }
    //         setInputValue("");
    //         handleGetGroupMessages(getGroupId);
    //     } catch (error) {
    //         console.error("Error sending message", error);
    //     }
    // }

    

// Handle receiving a group message
useEffect(() => {
    if (socket) {
        const handleReceiveGroupMessage = (newMessage) => {
            if (newMessage.group_id === currentGroupId) {
                setMessages((prevMessages) => [...prevMessages, newMessage]);
            }
        };
        socket.on('receiveGroupMessage', handleReceiveGroupMessage);
        return () => {
            socket.off('receiveGroupMessage', handleReceiveGroupMessage);
        };
    }
}, [socket, currentGroupId]);




    





//get group messge get all the messages in the group
const handleGetGroupMessages = async (groupId) => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/getGroupMessages`, {
            params: { groupId },
        });
        setMessages(response.data);
    } catch (error) {
        console.error("Error fetching group messages", error);
    }
};


  

    // Handle file selection
    const handleFileChange = (e) => {
      setFile([...e.target.files]); // Spread the FileList into an array
    };
    

    // remove the file
    const removeFile = (index) => {
      setFile((prevFiles) => prevFiles.filter((_, i) => i !== index));
    };


    const handleSendGroupMessage = async (e) => {
      e.preventDefault();
    
      if (!getGroupId || !inputValue) {
        alert("Please select a group and type a message.");
        return;
      }
    
      // Ensure that `file` is always an array (default to empty array if null or undefined)
      const messagePayload = {
        senderId: userId,
        groupId: getGroupId,
        content: inputValue,
        files: Array.isArray(file) && file.length > 0 ? file.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          data: f // You might need to adjust this depending on your backend's file handling
        })) : [], // Empty array if no files
      };
      try {
        socket.emit('sendGroupMessage', messagePayload);
        setInputValue("");  // Clear the message input after sending
        setFile([]);  // Optionally clear the file input after sending
      } catch (error) {
        console.error("Error sending group message:", error);
      }
    };
    
    

  

    return (
        <Container className="py-4 bg-light">
          <Row className="flex-grow-1">
            
            {/* User List */}
            <Col md={4} className="d-flex flex-column bg-white rounded shadow-sm p-3">
              <div className="d-flex align-items-center justify-content-between">
                <h3 className="mb-3 p-2 text-primary">{userName}</h3>
                <Button
                  type="button"
                  label="Create Group"
                  icon="pi pi-users"
                  outlined
                  className="p-button-secondary"
                  onClick={handleGroupCreate}
                />
              </div>
              
              <div>
                {/* Display the user list */}
                <ListGroup variant="flush" className="overflow-auto" style={{ height: '400px', backgroundColor: '#f9f9f9' }}>
                  {userlist.length > 0 ? (
                    userlist.map((user) => (
                      <ListGroup.Item
                        key={user.user_id}
                        className={`cursor-pointer ${user.user_id === selectedUsers ? 'bg-primary text-white' : ''}`}
                        onClick={() => handleUserClick(user)}
                        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #ddd' }}
                      >
                        {user.user_name}
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item>No users found</ListGroup.Item>
                  )}
                </ListGroup>
    
                {/* Display the group list */}
                <ListGroup variant="flush" className="overflow-auto mt-4" style={{ height: '200px', backgroundColor: '#f9f9f9' }}>
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <ListGroup.Item
                        key={group.group_id}
                        style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #ddd' }}
                        onClick={() => handleGroupClick(group)}
                      >
                        {group.group_name}
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item>No groups found</ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Col>
    
            {/* Chat Box (User or Group) */}


            <Col md={8} className="d-flex flex-column bg-white rounded shadow-sm p-3">


              {receiverName && !getGroupId && (
                <div className="mb-2">
                  <strong>{receiverName}</strong>
                </div>
              )}
              {showGroupName && getGroupId && (
                <div className="mb-2">
                  <strong className="capitalize">{showGroupName}</strong>
                  <ul className="d-flex flex-row flex-wrap gap-2" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                    {selectedGroup.length > 0 ? (
                      selectedGroup.map((user) => (
                        <li key={user.user_id}>
                          {user.user_id === parseInt(userId, 10) ? <span>You</span> : <span>{user.user_name},</span>}
                        </li>
                      ))
                    ) : (
                      <p>No members found.</p>
                    )}
                  </ul>
                </div>
              )}

              {/* Message Display Section */}


              {/* <div className="flex-grow-1 overflow-auto border border-light rounded p-3 mb-2" style={{ height: '400px', backgroundColor: '#f1f1f1' }}>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <div key={msg.message_id} className={`d-flex mb-2 ${msg.sender_id === parseInt(userId, 10) ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div className="message-bubble p-2" style={{
                        backgroundColor: msg.sender_id === parseInt(userId, 10) ? '#007bff' : '#f0f0f0',
                        color: msg.sender_id === parseInt(userId, 10) ? '#fff' : '#000',
                        borderRadius: '15px',
                        maxWidth: '80%',
                      }}>
                        <strong>{msg.sender_id === parseInt(userId, 10) ? 'You' : msg.user_name}:</strong> {msg.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div>No messages yet.</div>
                )}
              </div> */}

                <div className="flex-grow-1 overflow-auto border border-light rounded p-3 mb-2" style={{ height: '400px', backgroundColor: '#f1f1f1' }}>
                  {messages.length > 0 ? (
                    messages.map((msg) => (
                      <div key={msg.message_id} className={`d-flex mb-2 ${msg.sender_id === parseInt(userId, 10) ? 'justify-content-end' : 'justify-content-start'}`}>
                        <div className="message-bubble p-2" style={{
                          backgroundColor: msg.sender_id === parseInt(userId, 10) ? '#007bff' : '#f0f0f0',
                          color: msg.sender_id === parseInt(userId, 10) ? '#fff' : '#000',
                          borderRadius: '15px',
                          maxWidth: '80%',
                        }}>

                          <strong>{msg.sender_id === parseInt(userId, 10) ? 'You' : msg.sender_name}:</strong> 
                              {msg.content}
                              
                          {/* Check if there are files attached to the message */}
                          {msg.files && msg.files.length > 0 && (
                              <div className="mt-2">
                                <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
                                  {msg.files.map((file) => (
                                    <li key={file.file_id}>
                                      {/* File type handling */}
                                      {file.file_name && (
                                       <>
                                       {/* If the file is an image */}

                                       {file.file_name.match(/\.(jpg|jpeg|png|gif)$/i) && (
                                         <div className="mt-2">
                                           <img
                                             src={`${fileUrl}/${file.file_name}`}
                                             alt="Uploaded file"
                                             style={{ maxWidth: '200px', maxHeight: '200px' }}
                                           />
                                         </div>
                                       )}
                                          {/* If the file is a PDF */}
                                          {file.file_name.match(/\.(pdf)$/i) && (
                                            <div className="mt-2">
                                              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                                <strong>View PDF</strong>
                                              </a>
                                            </div>
                                          )}

                                          {/* If the file is an Excel file */}
                                          {file.file_name.match(/\.(xls|xlsx)$/i) && (
                                            <div className="mt-2">
                                              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                                <strong>View Excel File</strong>
                                              </a>
                                            </div>
                                          )}

                                          {/* Default fallback for other file types */}
                                          {!file.file_name.match(/\.(jpg|jpeg|png|gif|pdf|xls|xlsx)$/i) && (
                                            <div className="mt-2">
                                              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                                <strong>Download File</strong>
                                              </a>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                          )}

                        </div>
                      </div>
                    ))
                  ) : (
                    <div>No messages yet.</div>
                  )}
                </div>

              {/* Message Input Section */}
              { isShow && (
                <Form
                    onSubmit={receiverName && !getGroupId ? handleSendMessage : handleSendGroupMessage}
                    className="bg-light"
                  >
                    <Row className="d-flex align-items-center gap-3">
                      {/* File input with attachment icon */}
                      <Col xs="auto">
                        <label htmlFor="fileInput" className="d-flex align-items-center p-2">
                          <FiPaperclip size={20} className="me-2" /> 
                          <Form.Control
                            id="fileInput"
                            type="file"
                            multiple
                            onChange={handleFileChange} 
                            accept="image/*,application/pdf,.doc,.docx,.txt"
                            className="d-none" 
                          />
                        </label>
                      </Col>

                      {/* Message input */}
                      <Col>
                        <Form.Control
                          type="text"
                          placeholder="Type a message..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          required
                        />
                      </Col>
                    </Row>

                    {/* Display selected file preview */}

                    {file && file.length > 0 && (
                      <Row className="mt-3">
                        {file.map((f, index) => (
                          <Col key={index} xs="auto" className="mb-2 position-relative">
                            <div className="d-flex flex-column align-items-center">
                              {f.type.startsWith('image') && (
                                <img
                                  src={URL.createObjectURL(f)}
                                  alt={`File Preview ${index}`}
                                  className="img-fluid mb-2"
                                  style={{ maxWidth: '25px', maxHeight: '100px', objectFit: 'contain' }}
                                />
                              )}

                              {f.type === 'application/pdf' && (
                                <div className="text-center mb-2">
                                  <strong>PDF file selected</strong>
                                </div>
                              )}

                              {f.type === 'application/msword' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? (
                                <div className="text-center mb-2">
                                  <strong>Word document selected</strong>
                                </div>
                              ) : f.type === 'text/plain' ? (
                                <div className="text-center mb-2">
                                  <strong>Text file selected</strong>
                                </div>
                              ) : null}
                              
                              {/* Cancel button */}
                              <button
                                type="button"
                                className="btn btn-link position-absolute top-0 end-0"
                                onClick={() => removeFile(index)}
                                style={{ fontSize: '16px', color: '#dc3545' }} // Red color for cancel
                              >
                                <FiX />
                              </button>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    )}


                    {/* Send button */}
                    <Button
                      type="submit"
                      variant="success"
                      disabled={(receiverName && !getGroupId ? !receiverId : !getGroupId) || !inputValue}
                      className="w-100 mt-2"
                    >
                      Send
                    </Button>
                  </Form>
              )}
            </Col>
          </Row>


          {/* Create Group Dialog */}
          <Dialog
            header="Create New Group"
            visible={showCreateGroup}
            onHide={handleCloseDialog}
            style={{ width: '30vw', height: '30vh', backgroundColor: '#ffffff' }}
            className="p-fluid p-shadow-24 p-3 m-3"
          >
            <Card style={{ height: '100%' }} className="p-shadow-24 p-mb-4 p-p-3">
              <Form className="mb-3">
                {/* Group Name Input */}
                <Form.Group controlId="groupName">
                  <Form.Label className="text-muted">Group Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className="mb-3 p-2"
                    style={{
                      backgroundColor: '#e0e0e0', 
                      border: '1px solid #ccc', 
                      borderRadius: '5px', 
                    }}
                  />
                </Form.Group>
    
                {/* MultiSelect for Users */}
                <Form.Group controlId="selectUsers">
                  <Form.Label className="text-muted">Select Users</Form.Label>
                  <MultiSelect
                    value={selectedUsers}
                    options={userlist}
                    onChange={(e) => setSelectedUsers(e.value)}
                    optionLabel="user_name"
                    display="chip"
                    placeholder="Select users"
                    style={{
                      width: '100%',
                      backgroundColor: '#e0e0e0',
                      border: '1px solid #ccc',
                      borderRadius: '5px',
                      text: 'black',
                    }}
                    className="mb-3"
                  />
                </Form.Group>
    
                {/* Create Group Button */}
                <Button
                  type="button"
                  label="Create Group"
                  icon="pi pi-check"
                  onClick={handleCreateGroup}
                  disabled={!groupName || selectedUsers.length === 0}
                  className="p-button-success w-100"
                />
              </Form>
            </Card>
          </Dialog>


        </Container>
      );
    };
