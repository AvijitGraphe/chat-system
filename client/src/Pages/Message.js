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
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';

import 'primeicons/primeicons.css';
        
        

export default function Message() {
  const [inputValue, setInputValue] = useState("");
  const [userlist, setUserlist] = useState([]);
  const [messages, setMessages] = useState([]);
  const [receiverId, setReceiverId] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const {userId, accessToken } = useContext(AuthContext);
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
  const [groupMessageStore, setGroupMessageStore] = useState([]);
  const [prevGroupId, setPrevGroupId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [userName, setUserName] = useState("");
  const [lastmessage, setLastmessage] = useState("");
  const [lastMessages, setLastMessages] = useState([]);
  const [storeUserList, setStoreUserList] = useState([]);
  const [lastGroupMessage, setLastGroupMessage] = useState([]);
  const [tick, setTick] = useState(false);


  //chat contaienr ref..
  const chatcontainerRef = useRef(null)

useEffect(() =>{
  if(chatcontainerRef.current){
    chatcontainerRef.current.scrollTop = chatcontainerRef.current.scrollHeight;
  }
}, [messages])

  //show the file url
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
    fetchLastMessage(response.data);
    getUserName(userId);
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
  setReceiverName(user.username);
  setInputValue("");
 
  setShow(true);
  setCheckId(user.user_id);
  setGetUserIdActive(user.user_id);
  handleCheckId(user.user_id);
  clearStoreMessage(user.user_id);

  handleLeaveGroup(prevGroupId);

};




// Function to clear store message based on clearId
const clearStoreMessage = async (clearId) => {
  try {
    if(socket){
      const payload = {
        userId,
        clearId
      };
      socket.emit('clearMessages', payload);
      socket.on('clearMessagesResponse', (response) => {
          if (response.error) {
              console.error("Error clearing messages:", response.error);
          } else {
              fetchMessages(userId, clearId);
              handleShowLength(userId); 
          }
      });
    }
  } catch (error) {
    console.error("Error clearing messages:", error);
  }
};

//get username 
const getUserName = async (userId) => {
  try {
    const response = await axios.get(`${config.apiUrl}/api/getUserName`, {
      params: { userId },
    });
    setUserName(response.data);
  } catch (error) {
    console.error("Error fetching user name:", error);
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


//socket connection with the server
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
    const senderMessage = (newMessage) => {
      setMessages((prevMessages) => {
        if (Array.isArray(newMessage)) {
          if (newMessage.length === 0) {
            return prevMessages;
          }
          const filteredMessages = newMessage.filter(msg => msg.receiver_id === parseInt(checkId, 10));
          const updatedMessages = [...prevMessages];
          filteredMessages.forEach((msg) => {
            const messageIndex = updatedMessages.findIndex((prevMsg) => prevMsg.message_id === msg.message_id);
            if (messageIndex !== -1) {
              updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...msg };
            } else {
              updatedMessages.push(msg);
            }
          });
    
          return updatedMessages;
        } 
        else {
          const messageIndex = prevMessages.findIndex((msg) => msg.message_id === newMessage.message_id);
          if (messageIndex !== -1) {
            const updatedMessages = [...prevMessages];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...newMessage };
            return updatedMessages;
          } else {
            return [...prevMessages, newMessage];
          }
        }
      });
    };
    
  
  
  
    //message reciver with used id and not the current user.
      const handleReceiveMessage = (newMessage) => {
        fetchLastMessage(userlist);
        //sotre the message
        if (parseInt(newMessage.sender_id, 10) !== parseInt(checkId, 10)) {
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
          if(newMessage.receiver_id){
            responseMessage(newMessage);
            setMessages((prevMessages) => {
              const messageIndex = prevMessages.findIndex((msg) => msg.message_id === newMessage.message_id);
              if (messageIndex !== -1) {
                  const updatedMessages = [...prevMessages];
                  updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...newMessage };
                  return updatedMessages;
              } else {
                  return [...prevMessages, newMessage];
              }
          });
          }
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
      console.log("activeUsers", activeUsers);
      setActiveUsers(activeUsers);
    };

    socket.on("senderMessage", senderMessage);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("activeUserList", handleActiveUserList);

    return () => {
      socket.off("senderMessage", senderMessage);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("activeUserId");
      socket.off("activeUserList");
    };
  }
}, [socket, userId, checkId, activeGroup, userlist]);




//response message
const responseMessage= (newMessage) => {
  if(socket){
    socket.emit('response', newMessage);
  }else{
    console.log("no data response")
  }
};


useEffect(() => {
  if (socket) {
    socket.on('response', (data) => {
      if(socket){
        if (data.status === 'check') {
        } else if (data.status === 'error') {
          console.log('Error or no changes:', data.message);
        }
      }
    });
  }
}, [socket]);





//Show all effect data
useEffect(() => {
  fetchUserList();
  handleShowGroups(userId);
  handleShowLength(userId);
  handelGroupMessageLnegth(userId);
  // fetchLastMessage(userId);
  handleLastGroupMessage(userId);
}, [userId]);



//Show the length of the message
const handleShowLength = async (userId) => {  
  const response = await axios.get(`${config.apiUrl}/api/getMessageLength`, {
    params: { userId },
  });        
  setStoreMessage(response.data); 
};

//Show all groups list
const handleGroupCreate = async () => {
  setShowCreateGroup(true);
};

{/* close create group dialog */}
const handleCloseDialog = () => {
  setShowCreateGroup(false);
  setSelectedUsers([]);
  setGroupName("");
};

{/*Create new group lists */}
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
      handelGroupMessageRead(userId, group.group_id);
    } else {
      console.error("Failed to fetch group members", response);
    }
  } catch (error) {
    console.error("Error fetching group members", error);
  }
};

//Message send emmit one to one
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

//Join group
const handleJoinGroup = (groupId) => {
  if (socket) {
    socket.emit("joinGroup", groupId);
  }
  setPrevGroupId(groupId);
};

//Leave group
const handleLeaveGroup = (groupId) => {
  if (socket) {
    socket.emit("leaveGroup", groupId);
  }
  // Update local state after the user leaves
  setPrevGroupId(null);  
};


//For checking the user id
const handleCheckId = (checkId) => {
  if (socket) {
    socket.emit("joinCheckId", checkId);
  }
};




//group message handler
useEffect(() => {
  if (socket) {
    const handleReceiveGroupMessage = (newMessage) => {
      if (newMessage.group_id === currentGroupId) {
        handelGroupMessageRead(userId, newMessage.group_id);
        handleLastGroupMessage(userId);
            // socket.emit("groupMessagerespone", newMessage);
        setMessages((prevMessages) => {
          if (Array.isArray(newMessage)) {
            if (newMessage.length === 0) {
              return prevMessages;
            }
            const filteredMessages = newMessage.filter(msg => msg.receiver_id === parseInt(checkId, 10));
            const updatedMessages = [...prevMessages];
            filteredMessages.forEach((msg) => {
              const messageIndex = updatedMessages.findIndex((prevMsg) => prevMsg.message_id === msg.message_id);
              if (messageIndex !== -1) {
                updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...msg };
              } else {
                updatedMessages.push(msg);
              }
            });
            return updatedMessages;
          } else {
            const messageIndex = prevMessages.findIndex((msg) => msg.message_id === newMessage.message_id);
            if (messageIndex !== -1) {
              const updatedMessages = [...prevMessages];
              updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...newMessage };
              return updatedMessages;
            } else {
              return [...prevMessages, newMessage];
            }
          }
        });
      } else {
        console.log(`Message (group_id: ${newMessage.group_id}):`, newMessage);
      }
    };
    
    // Handle notifications for groups user;
    const handleReceiveGroupNotification = (notification) => {
      if (notification.group_id !== currentGroupId) {
        handelGroupMessageLnegth(userId)
        handleLastGroupMessage(userId);
      }
    };
    socket.on("receiveGroupMessage", handleReceiveGroupMessage);
    socket.on("receiveGroupNotification", handleReceiveGroupNotification);
    return () => {
      socket.off("receiveGroupMessage", handleReceiveGroupMessage);
      socket.off("receiveGroupNotification", handleReceiveGroupNotification);
    };
  }
}, [socket, currentGroupId]);

  


//get unread message length
const handelGroupMessageLnegth = async (userId) => {
const response = await axios.get(`${config.apiUrl}/api/getGroupMessageLength`, {
  params: { userId },
});
setGroupMessageStore(response.data);
}


  
//get unread message and read message
const handelGroupMessageRead = async (userId, groupId) => {
  const groupIdAsNumber = isNaN(Number(groupId)) ? groupId : Number(groupId);
  try {
    await axios.post(`${config.apiUrl}/api/getGroupMessageRead`, {
      userId,
      groupId: groupIdAsNumber  
    });
    handelGroupMessageLnegth(userId);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }

}



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

// Send group message
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


// Handle typing indicator
let typingTimeout; 
const handleInputChange = (e) => {
  setInputValue(e.target.value);
};

  
//reply to a message
const handleReplyClick = (message) => {
  setReplyingTo(message); 
  setInputValue("");
};


// Helper function to format the date
const formatDate = (messageDate) => {
  const now = new Date();
  const messageDateObj = new Date(messageDate);
  if (isNaN(messageDateObj)) {
    console.error("Invalid date:", messageDate);
    return " ";  
  }
  const isToday = now.toDateString() === messageDateObj.toDateString();
  const isYesterday = (now - messageDateObj) / (1000 * 60 * 60 * 24) === 1;
  if (isToday) {
    return "Today";
  } else if (isYesterday) {
    return "Yesterday";
  } else {
    const day = messageDateObj.getDate().toString().padStart(2, "0");
    const month = (messageDateObj.getMonth() + 1).toString().padStart(2, "0"); 
    const year = messageDateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

//time tracker
const timeTracker = (timestamp) => {
  return timestamp.toLocaleString("en-US", { 
    timeZone: "Asia/Kolkata", 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true
  });
};

//fetch the last message
const fetchLastMessage = async (data) => {
  try {
    const userIds = data.map(user => user.user_id);
    const response = await axios.get(`${config.apiUrl}/api/getLastMessagesByUser`, {
      params: {
        userId,
        user_ids: userIds
      }
    });
    setLastMessages(response.data);
  } catch (error) {
    console.error("Error fetching last message:", error);
  }
};

//fetch the group message
const handleLastGroupMessage = async (userId) => {
  try {
    const response = await axios.get(`${config.apiUrl}/api/getLastGroupMessage`, {
      params: { userId },
    });
    setLastGroupMessage(response.data);
  } catch (error) {
    console.error("Error fetching last group message:", error);
  }
};


  return (
    <Container className="py-4 bg-light">
      <Row className="flex-grow-1">
        {/* User List */}
        <Col
          md={4}
          className="d-flex flex-column bg-white rounded shadow-sm p-3"
        >
            {/* create group button */}
            <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
            <h3 className="mb-3 p-2 text-primary text-capitalize-custom">
              {userName}
            </h3>
            {activeUsers.some(
              (activeUser) => activeUser.userId === userId
            ) && (
              <span className="badge bg-success ms-2">
                Active
              </span>
            )}
          </div>
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
              ].map((item) => {
                // Ensure unique key by combining 'type' and ID
                const key = item.type === 'user' ? `user-${item.user_id}` : `group-${item.group_id}`;
                return (
                  <ListGroup.Item
                    key={key}  // Unique key based on type and ID
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
                    type="button"
                  >
                    <div className="d-flex">
                      <div className="d-flex align-items-center">
                        {/* Left Section - Avatar for profile picture */}
                        <Avatar
                          label=""
                          size="large"
                          style={{ backgroundColor: '#8BA5B9FF', color: '#ffffff' }}
                          shape="circle"
                        />
                        <div className="d-flex flex-column ms-2">
                          {/* Display Username or Group Name */}
                          <span className="fw-bold">
                            {item.type === 'user' ? item.username : `${item.group_name}(Group)`}
                          </span>

                          {/* Last message text and status */}
                          <div className="d-flex align-items-center mt-1">
                            {/* Last message for one-to-one */}
                            {item.type === 'user' && Array.isArray(lastMessages) && lastMessages.length > 0 && (
                                lastMessages
                                  .filter(message => message.sender_id === item.user_id || message.receiver_id === item.user_id)
                                  .map((message, index) => {
                                    const words = message.content.split(' ');  
                                    const first5Words = words.slice(0, 5).join(' ');  // First 5 words
                                    const displayText = words.length > 5 ? `${first5Words}...` : first5Words;  // Append "..." if more than 5 words

                                    // Assuming message.created_at is a valid date string
                                    const formattedDate = timeTracker(new Date(message.created_at)); 

                                    return (
                                      <div key={index} className="d-flex justify-content-between  gap-4">
                                        <p>{displayText}</p>
                                        <small>{formattedDate}</small>
                                      </div>
                                    );
                                    
                                  })
                              )}

                              {/* Last message for group */}
                              {item.type === 'group' && Array.isArray(lastGroupMessage) && lastGroupMessage.length > 0 && (
                                lastGroupMessage
                                  .filter(message => message.groupId === item.group_id)
                                  .map((message, index) => {
                                    const words = message.content.split(' ');  
                                    const first5Words = words.slice(0, 5).join(' ');  // First 5 words
                                    const displayText = words.length > 5 ? `${first5Words}...` : first5Words;  

                                    // Assuming message.created_at is a valid date string
                                    const formattedDate = timeTracker(new Date(message.created_at)); 

                                    return (
                                      <div key={index} className="d-flex justify-content-between  gap-4">
                                        <p>{displayText}</p>
                                        <small>{formattedDate}</small>
                                      </div>
                                    );
                                    
                                  })
                              )}

                            <p className="mb-0 text-end" style={{ marginLeft: '10px' }}>
                              {/* Conditional rendering of message count */}
                              {item.type === 'user' && Array.isArray(storeMessage) && storeMessage.some(message => {
                                const messageKey = Object.keys(message)[0];
                                return parseInt(messageKey, 10) === item.user_id && parseInt(messageKey, 10) !== checkId;
                              }) && (
                                <Badge
                                  value={storeMessage.find(message => Object.keys(message)[0] === String(item.user_id))?.[item.user_id] || 0}
                                  severity="success"
                                  style={{ fontSize: "12px" }}
                                />
                              )}

                              {item.type === 'group' && (
                                <div>
                                  {item.group_id !== currentGroupId && item.sender_id !== userId ? (
                                    <Badge
                                      value={groupMessageStore.find(group => group.group_id === item.group_id)?.unread || null}
                                      severity="success"
                                      style={{ fontSize: "12px" }}
                                    />
                                  ) : null}
                                </div>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Active User Badge */}
                      {item.type === 'user' && activeUsers.some(
                        (activeUser) => String(activeUser.userId) === String(item.user_id)
                      ) && (
                        <span className="badge bg-success position-absolute top-0 end-0 m-2">
                          Active
                        </span>
                      )}



                    </div>
                  </ListGroup.Item>
                );
              })
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
                <div className="mb-2 d-flex align-items-center">
                  <Avatar 
                        label="" 
                        size="large" 
                        style={{ backgroundColor: '#8BA5B9FF', color: '#ffffff' }} 
                        shape="circle" 
                      />
                  <strong style={{textTransform:"capitalize"}}>{receiverName}</strong>
                </div>
              )}
              {showGroupName && getGroupId && (
                <div className="mb-2 d-flex align-items-center">
                  <Avatar 
                      label="" 
                      size="large" 
                      style={{ backgroundColor: '#AAB6C0FF', color: '#ffffff' }} 
                      shape="circle" 
                    />
                    <div>
                      <strong className="capitalize" style={{textTransform:"capitalize"}}>{showGroupName}</strong>
                      <ul
                        className="d-flex flex-row flex-wrap gap-2"
                        style={{ listStyleType: "none", paddingLeft: 0 }}
                      >
                            {selectedGroup.length > 0 ? (
                              selectedGroup.map((user) => (
                                <li key={user.user_id}>
                                  {user.user_id === parseInt(userId, 10) ? (
                                    <span>
                                      You
                                      {activeUsers.some((activeUser) => (String(activeUser.userId) === String(user.user_id))) && (

                                        <span style={{ color: 'green', marginLeft: '5px' }}>●</span> 
                                      )},
                                    </span>
                                  ) : (
                                    <span>
                                      {user.username}
                              
                                      {activeUsers.some((activeUser) => String(activeUser.userId) === String(user.user_id)) && (
                                        <span style={{ color: 'green', marginLeft: '5px' }}>●</span>
                                      )},
                                    </span>
                                  )}
                                </li>
                              ))
                            ) : (
                              <p>No members found.</p>
                            )}
                      </ul>
                    </div>
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
                    messages.map((msg, index) => {
                      const isSender = parseInt(msg.sender_id, 10) === parseInt(userId, 10); 
                      
                      // Format the date
                      const formattedDate = formatDate(msg.timestamp);

                      const showDate = index === 0 || formattedDate !== formatDate(messages[index - 1].timestamp);
                      
                      return (
                        <div
                          key={msg.message_id}
                          className={`d-flex mb-2 ${isSender ? "justify-content-end" : "justify-content-start"}`}
                        >
                          {showDate && (
                            <div
                              style={{
                                width: "100%",  
                                textAlign: "center",  
                                margin: "10px 0",  
                              }}
                            >
                              <p className="message-date" style={{ fontSize: "0.8rem", color: "#888" }}>
                                {formattedDate}
                              </p>
                            </div>
                          )}
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
                              onClick={() => handleReplyClick(msg)}  
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
                            <p>{timeTracker(new Date(msg.timestamp))}</p>

                          
                          {/* messge confirem */}
                          <p>
                              { msg.status === "check" ? (
                                <>
                                  <i className="pi pi-check" style={{ color: 'black' }}></i>
                                  <i className="pi pi-check" style={{ color: 'black' }}></i>
                                </>
                              ) : (
                                <i className="pi pi-check" style={{ color: 'black' }}></i>
                              )}
                          </p>

                          <p>
                            {}
                          </p>

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
                        <div className="d-flex justify-content-between align-items-center">
                            <strong>Replying to:</strong> 
                            <i className="pi pi-times p-2" onClick={() => setReplyingTo(null)}></i>
                        </div>
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
                    optionLabel="username"
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
