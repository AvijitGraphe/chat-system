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
import { FiPaperclip } from "react-icons/fi";
import { FiX } from "react-icons/fi";

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
  const [showGroupName, setShowGroupName] = useState("");
  const [show, setShow] = useState(false);
  const [anotherCondition, setAnotherCondition] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState([]);
  const [getGroupId, setGetGroupId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [checkId, setCheckId] = useState(null);
  const [isShow, setIsShow] = useState(false);
  const [file, setFile] = useState([]);

  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [hoverMessage, setHoverMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [getUserIdActive, setGetUserIdActive] = useState(null);
  const [storeMessage, setStoreMessage] = useState([]);


  //chat contaienr ref..
  const chatcontainerRef = useRef(null)

  useEffect(() =>{
    if(chatcontainerRef.current){
      chatcontainerRef.current.scrollTop = chatcontainerRef.current.scrollHeight;
    }
  }, [messages])

  const fileUrl = "http://localhost:5000/routes/uploads";

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
      // handleShowLength(userId);
    } catch (error) {
      console.error("Error fetching user list", error);
    }
  };

  const handleUserClick = (user) => {
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
    setCheckId(user.user_id);
    setGetUserIdActive(user.user_id);
    handleCheckId(user.user_id);

    clearStoreMessage(user.user_id);


  };


  //clear the store message





  const clearStoreMessage = async (userId) => {
    try {
        const response = await axios.get(`${config.apiUrl}/api/getClearMessage`, {
            params: { userId },
        });
        console.log(response.data);
        setStoreMessage(response.data);
    } catch (error) {
        console.error("Error clearing messages:", error);
    }
};









  // Fetch chat messages from the server
  const fetchMessages = async (userId, receiverId) => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/getMessages`, {
        params: { userId, otherUserId: receiverId },
      });
      setMessages(response.data);
      setReplyingTo([]);
    } catch (error) {
      console.error("Error fetching messages", error);
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const socketUrl = `${protocol}${window.location.hostname}${
      window.location.port ? `:${window.location.port}` : ""
    }`;
    const newSocket = io(`${config.apiUrl}`, {
      query: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token: accessToken },
    });
    // Set the socket instance
    setSocket(newSocket);
    newSocket.on("connect", () => {});
    newSocket.on("connected", (data) => {});
    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);

  useEffect(() => {


    if (socket) {   
      //message sender
      const senderMessage = (newMessage) => {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
      };


      //message reciver with used id and not the current user
        const handleReceiveMessage = (newMessage) => {

          //sotre the message
          if (parseInt(newMessage.sender_id, 10) !== parseInt(checkId, 10)) {

            // setStoreMessage((prevMessages) => [...prevMessages, newMessage]);
            // handleShowLength(userId);

            handleShowLength(userId);

          }
        
        //length of the store message
        if (
          newMessage &&
          parseInt(newMessage.sender_id, 10) === parseInt(checkId, 10)
        ) 
        //show of the message in the chat
        {
          if (newMessage.receiver_id === parseInt(userId, 10)) {

            setMessages((prevMessages) => [...prevMessages, newMessage]);
            responseMessage(newMessage);

          } else {
            console.log("Message doesn't belong to the current user.");
          }
        }
      };

      // Typing event handler
      const handleTyping = (groupId, users) => {
        if (groupId === parseInt(activeGroup, 10)) {
          setTypingUsers(users.map((user) => user.userName));
        } else {
          setTypingUsers([]);
        }
      };
      // Stop typing event handler
      const handleStopTyping = (groupId, users) => {
        setTypingUsers([]);
      };
      const handleActiveUserList = (activeUsers) => {
        setActiveUsers(activeUsers);
      };


      socket.on("senderMessage", senderMessage);
      socket.on("typing", handleTyping);
      socket.on("stopTyping", handleStopTyping);
      socket.on("receiveMessage", handleReceiveMessage);
      socket.on("activeUserList", handleActiveUserList);

      return () => {
        socket.off("senderMessage", senderMessage);
        socket.off("receiveMessage", handleReceiveMessage);
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("userStopTyping");
        socket.off("activeUserId");
        socket.off("activeUserList");
      };
    }
  }, [socket, userId, checkId, activeGroup]);




    //response message
    const responseMessage= (newMessage) => {
      if(socket){
        socket.emit('respone', newMessage);
        console.log(newMessage);
      }else{
        console.log("no data response")
      }
    };



  useEffect(() => {
    fetchUserList();
    handleShowGroups(userId);
    handleShowLength(userId);
  }, [userId]);


  const handleShowLength = async (userId) => {      
    const response = await axios.get(`${config.apiUrl}/api/getMessageLength`, {
      params: { userId },
    });    
    setStoreMessage(response.data); 
  };
  



  const handleGroupCreate = async () => {
    setShowCreateGroup(true);
  };

  {/* close create group dialog */}
  const handleCloseDialog = () => {
    setShowCreateGroup(false);
    setSelectedUsers([]);
    setGroupName("");
  };

  {/*create group lists */}
  const handleCreateGroup = async () => {
    if (!groupName || selectedUsers.length === 0) {
      alert("Please enter a group name and select at least one user.");
      return;
    }
    const payload = {
      groupName: groupName,
      selectedUsers: selectedUsers,
      userId: userId,
    };
    await axios.post(
      `${config.apiUrl}/api/createGroup`,
      payload
    );
    setSelectedUsers([]);
    setGroupName("");
    setShowCreateGroup(false);
    handleShowGroups(userId);
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

  // Handle group data send 
  const handleGroupClick = async (group) => {
    try {
      setIsShow(true);
      setGetGroupId(group.group_id);
      setCurrentGroupId(group.group_id);
      setShowGroupName(group.group_name);
      setShow(false);
      setAnotherCondition(true);
      setMessages([]);
      setReceiverName([]);
      handleGetGroupMessages(group.group_id);
      setActiveGroup(group.group_id);
      setReplyingTo([]);
      setCheckId(null);
      setInputValue("");
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
      sender_name: userName,
      prevMessageId: replyingTo ? replyingTo.message_id : null,
      prevContent: replyingTo ? replyingTo.content : "",
      rebackName: replyingTo ? replyingTo.sender_name : "",
      files:
        Array.isArray(file) && file.length > 0
          ? file.map((f) => ({
              name: f.name,
              size: f.size,
              type: f.type,
              data: f,
            }))
          : [],
    };
    try {
      if (socket) {
        socket.emit("sendMessage", payload);
      }
      setInputValue("");
      setFile([]);
      setReplyingTo("")
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const handleJoinGroup = (groupId) => {
    if (socket) {
      socket.emit("joinGroup", groupId);
    }
  };

  const handleLeaveGroup = (groupId) => {
    if (socket) {
      socket.emit("leaveGroup", groupId);
    }
  };
  
  const handleCheckId = (checkId) => {
    if (socket) {
      socket.emit("joinCheckId", checkId);
      console.log("joinCheckId", checkId);
    }
  };


  // Handle receiving a group message
  useEffect(() => {
    if (socket) {
      const handleReceiveGroupMessage = (newMessage) => {
        if (newMessage.group_id === currentGroupId) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      };
      socket.on("receiveGroupMessage", handleReceiveGroupMessage);
      return () => {
        socket.off("receiveGroupMessage", handleReceiveGroupMessage);
      };
    }
  }, [socket, currentGroupId]);

  //get group messge get all the messages in the group
  const handleGetGroupMessages = async (groupId) => {
    try {
      const response = await axios.get(
        `${config.apiUrl}/api/getGroupMessages`,
        {
          params: { groupId },
        }
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching group messages", error);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setFile([...e.target.files]);
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
    const messagePayload = {
      senderId: userId,
      groupId: getGroupId,
      content: inputValue,
      prevMessageId: replyingTo ? replyingTo.message_id : null,
      prevContent: replyingTo ? replyingTo.content : "",
      sender_name: userName,
      rebackName: replyingTo ? replyingTo.sender_name : "",

      files:
        Array.isArray(file) && file.length > 0
          ? file.map((f) => ({
              name: f.name,
              size: f.size,
              type: f.type,
              data: f,
            }))
          : [],
    };
    try {
      socket.emit("sendGroupMessage", messagePayload);
      setInputValue("");
      setFile([]);
      setReplyingTo("");
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  let typingTimeout; 

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // If there is text input
    if (e.target.value.length > 0) {
      if (getGroupId) {
        socket.emit("typing", getGroupId, userId, userName);
        setTyping(true);
      } else if (checkId) {
        socket.emit("userTyping", userId, userName, checkId);
        setTyping(true);
      } else {
        return null;
      }
  
      // Clear previous timeout, then set a new one
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        if (getGroupId) {
          socket.emit("stopTyping", getGroupId, userId, userName);
        } else if (checkId) {
          socket.emit("userStopTyping", userId, userName, checkId);
        }
        setTyping(false);
      }, 1000);
  
    } else {
      // If input is cleared, stop typing immediately
      clearTimeout(typingTimeout);
      if (getGroupId) {
        socket.emit("stopTyping", getGroupId, userId, userName);
      } else if (checkId) {
        socket.emit("userStopTyping", userId, userName, checkId);
      }
      setTyping(false);
    }
  };
  
  

  //reply to a message
  const handleReplyClick = (message) => {
    setReplyingTo(message); 
    setInputValue("");
  };

  


  return (
    <Container className="py-4 bg-light">
      <Row className="flex-grow-1">
        {/* User List */}
        <Col
          md={4}
          className="d-flex flex-column bg-white rounded shadow-sm p-3"
        >
          <div className="d-flex align-items-center justify-content-between">
            <h3 className="mb-3 p-2 text-primary text-capitalize-custom" style={{textTransform: "capitalize"}}>{userName}</h3>
            <Button
              type="button"
              label="Create Group"
              icon="pi pi-users"
              outlined
              className="p-button-secondary"
              onClick={handleGroupCreate}
            />
          </div>


           {/* Display Users and Groups in One ListGroup */}
            <div>
                <ListGroup
                  variant="flush"
                  className="overflow-auto"
                  style={{ height: "600px", backgroundColor: "#f9f9f9", textTransform: "capitalize" }}
                >
                  {[
                    ...userlist.map((user) => ({ type: 'user', ...user })),
                    ...groups.map((group) => ({ type: 'group', ...group }))
                  ].length > 0 ? (
                    [
                      ...userlist.map((user) => ({ type: 'user', ...user })),
                      ...groups.map((group) => ({ type: 'group', ...group }))
                    ].map((item) => (
                      <ListGroup.Item
                        key={item.type === 'user' ? item.user_id : item.group_id}
                        className={`cursor-pointer ${
                          (item.type === 'user' && item.user_id === selectedUsers) ||
                          (item.type === 'group' && item.group_id === selectedGroup)
                            ? 'bg-primary text-white'
                            : ''
                        }`}
                        onClick={() => item.type === 'user' ? handleUserClick(item) : handleGroupClick(item)}
                        style={{
                          backgroundColor: "#ffffff",
                          borderBottom: "1px solid #ddd",
                          position: "relative",
                        }}
                      >

                        {/* Display green dot if the user is the sender of any message */}
                        
                         {/* {item.type === 'user' && storeMessage.some(message => parseInt(message.sender_id, 10) === item.user_id && parseInt(message.sender_id, 10) !== checkId) &&  (
                          <span className="dot-indicator position-absolute top-0 start-0 m-2" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "green" }}>

                          </span>
                        )}  




                        {item.type === 'user' && storeMessage.some(message => parseInt(message.sender_id, 10) === item.user_id && parseInt(message.sender_id, 10) !== checkId) && (
                          <span className="sender-id-length position-absolute top-0 start-25 m-2" style={{ fontSize: "12px", color: "green" }}>
                            {storeMessage.filter(message => parseInt(message.sender_id, 10) === item.user_id).length}
                          </span>
                        )} */}


{
  item.type === 'user' && Array.isArray(storeMessage) && storeMessage.some(message => {
    const messageKey = Object.keys(message)[0];
    return parseInt(messageKey, 10) === item.user_id && parseInt(messageKey, 10) !== checkId;
  }) && (
    <span className="dot-indicator position-absolute top-0 start-0 m-2" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "green" }}></span>
  )
}

{/* Display the length of sender_id */}
{
  item.type === 'user' && Array.isArray(storeMessage) && storeMessage.some(message => {
    const messageKey = Object.keys(message)[0];
    return parseInt(messageKey, 10) === item.user_id && parseInt(messageKey, 10) !== checkId;
  }) && (
    <span className="sender-id-length position-absolute top-0 start-25 m-2" style={{ fontSize: "12px", color: "green" }}>
      {
        storeMessage.find(message => Object.keys(message)[0] === String(item.user_id))?.[item.user_id] || 0
      }
    </span>
  )
}



          
                        {/* Check if the user or group is active */}
                        {item.type === 'user' && activeUsers.some(
                          (activeUser) => String(activeUser.userId) === String(item.user_id)
                        ) && (
                          <span className="badge bg-success position-absolute top-0 end-0 m-2">
                            Active
                          </span>
                        )}

                        {item.type === 'user' ? item.user_name : item.group_name}
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item>No users or groups found</ListGroup.Item>
                  )}
                </ListGroup>
            </div>




        </Col>
        <Col
          md={8}
          className="d-flex flex-column bg-white rounded shadow-sm p-3"
        >
          {receiverName && !getGroupId && (
            <div className="mb-2">
              <strong style={{textTransform:"capitalize"}}>{receiverName}</strong>
            </div>
          )}
          
          {showGroupName && getGroupId && (
            <div className="mb-2">
              <strong className="capitalize" style={{textTransform:"capitalize"}}>{showGroupName}</strong>
              <ul
                className="d-flex flex-row flex-wrap gap-2"
                style={{ listStyleType: "none", paddingLeft: 0 }}
              >

                {selectedGroup.length > 0 ? (
                  selectedGroup.map((user) => (
                    <li key={user.user_id}>
                      {user.user_id === parseInt(userId, 10) ? (
                        <span>You,</span>
                      ) : (
                        <span>{user.user_name},</span>
                      )}
                    </li>
                  ))
                ) : (
                  <p>No members found.</p>
                )}
              </ul>
            </div>
          )}


          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="mb-2">
              <ul>
                {typingUsers.map((user, index) => (
                  <li key={`${user}-${index}`} style={{ textTransform: "capitalize", color: "#0FE461FF" }}>
                    {user} is typing...
                  </li>
                ))}
              </ul>
            </div>
          )}


          {/* Message Display Section */}
          <div
            className="flex-grow-1 overflow-auto border border-light rounded p-3 mb-2"
            style={{ height: "400px", backgroundColor: "#f1f1f1" }}
            ref={chatcontainerRef}
          >
            {messages.length > 0 ? (
              messages.map((msg) => {
                const isSender = parseInt(msg.sender_id, 10) === parseInt(userId, 10); 
                return (
                  <div
                    key={msg.message_id}
                    className={`d-flex mb-2 ${isSender ? "justify-content-end" : "justify-content-start"}`}
                  >
                    <div
                      className="message-bubble p-2"
                      style={{
                        backgroundColor: isSender ? "#007bff" : "#f0f0f0",
                        color: isSender ? "#fff" : "#000",
                        borderRadius: "15px",
                        maxWidth: "80%",
                        position: "relative",
                      }}
                      onMouseEnter={() => setHoverMessage(msg.message_id)} 
                      onMouseLeave={() => setHoverMessage(null)}
                    >
                      {/* Displaying the Button */}
                      <Button
                        style={{
                          position: "absolute",  
                          left: isSender ? "0" : "auto",  
                          right: !isSender ? "0" : "auto", 
                          top: "50%",
                          transform: "translateY(-50%)",
                          visibility: hoverMessage === msg.message_id ? "visible" : "hidden", 
                        }}
                        onClick={() => handleReplyClick(msg)}  // Handle reply
                      >
                        Reply
                      </Button>
                      {/* Reply content (if any) */}
                      {msg.prevContent && (
                        <div className="reply-content" style={{ marginBottom: "10px", padding: "10px", backgroundColor: "#BEB8B8FF", borderRadius: "5px" }}>
                          <strong>Replying to:</strong>
                          <p>{msg.rebackName}</p>
                          <p>{msg.prevContent}</p>
                        </div>
                      )}
                      {/* Message Sender Name */}
                      <strong>
                        {isSender ? "You" : msg.sender_name}
                      </strong>
                      {/* Message Content */}
                      <p>{msg.content}</p>
                      {/* Display Files (if any) */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2">
                          <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
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
                                          style={{
                                            maxWidth: "200px",
                                            maxHeight: "200px",
                                          }}
                                        />
                                      </div>
                                    )}

                                    {/* If the file is a PDF */}
                                    {file.file_name.match(/\.(pdf)$/i) && (
                                      <div className="mt-2">
                                        <a
                                          href={file.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <strong>View PDF</strong>
                                        </a>
                                      </div>
                                    )}

                                    {/* If the file is an Excel file */}
                                    {file.file_name.match(/\.(xls|xlsx)$/i) && (
                                      <div className="mt-2">
                                        <a
                                          href={file.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <strong>View Excel File</strong>
                                        </a>
                                      </div>
                                    )}

                                    {/* Default fallback for other file types */}
                                    {!file.file_name.match(/\.(jpg|jpeg|png|gif|pdf|xls|xlsx)$/i) && (
                                      <div className="mt-2">
                                        <a
                                          href={file.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
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
                );
              })
            ) : (
              <div>No messages yet.</div>
            )}
          </div>


          {/* Message Input Section */}




          {isShow && (
            <Form
              onSubmit={
                receiverName && !getGroupId
                  ? handleSendMessage
                  : handleSendGroupMessage
              }
              className="bg-light"
            >
              <Row className="d-flex align-items-center gap-3">
                {/* File input with attachment icon */}
                <Col xs="auto">
                  <label
                    htmlFor="fileInput"
                    className="d-flex align-items-center p-2"
                  >
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

                {replyingTo && replyingTo.sender_name && replyingTo.content && (
                  <div className="replying-to">
                    <strong>Replying to:</strong> 
                    <p className="p-0 m-0">{replyingTo.sender_name}</p>
                    <p className="px-4">{replyingTo.content}</p>
                  </div>
                )}

                  
                  <Form.Control
                    type="text"
                    placeholder="Type a message..."
                    value={inputValue}
                    // onChange={(e) => setInputValue(e.target.value)}
                    onChange={handleInputChange}
                    required
                  />



                </Col>
              </Row>

              {/* Display selected file preview */}

              {file && file.length > 0 && (
                <Row className="mt-3">
                  {file.map((f, index) => (
                    <Col
                      key={index}
                      xs="auto"
                      className="mb-2 position-relative"
                    >
                      <div className="d-flex flex-column align-items-center">
                        {f.type.startsWith("image") && (
                          <img
                            src={URL.createObjectURL(f)}
                            alt={`File Preview ${index}`}
                            className="img-fluid mb-2"
                            style={{
                              maxWidth: "25px",
                              maxHeight: "100px",
                              objectFit: "contain",
                            }}
                          />
                        )}

                        {f.type === "application/pdf" && (
                          <div className="text-center mb-2">
                            <strong>PDF file selected</strong>
                          </div>
                        )}

                        {f.type === "application/msword" ||
                        f.type ===
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                          <div className="text-center mb-2">
                            <strong>Word document selected</strong>
                          </div>
                        ) : f.type === "text/plain" ? (
                          <div className="text-center mb-2">
                            <strong>Text file selected</strong>
                          </div>
                        ) : null}

                        {/* Cancel button */}
                        <button
                          type="button"
                          className="btn btn-link position-absolute top-0 end-0"
                          onClick={() => removeFile(index)}
                          style={{ fontSize: "16px", color: "#dc3545" }} // Red color for cancel
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
                disabled={
                  (receiverName && !getGroupId ? !receiverId : !getGroupId) ||
                  !inputValue
                }
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
        style={{ width: "30vw", height: "30vh", backgroundColor: "#ffffff" }}
        className="p-fluid p-shadow-24 p-3 m-3"
      >
        <Card style={{ height: "100%" }} className="p-shadow-24 p-mb-4 p-p-3">
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
                  backgroundColor: "#e0e0e0",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
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
                  width: "100%",
                  backgroundColor: "#e0e0e0",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  text: "black",
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
}
