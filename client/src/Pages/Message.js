import React, { useState, useEffect, useContext, useRef } from "react";
import { Container, Row, Col, Form, ListGroup, Collapse } from "react-bootstrap";
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
import "primereact/resources/themes/lara-light-cyan/theme.css";

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
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [typingTrack, setTypingTrack] = useState(false);
  const [isCheck, setIsCheck] = useState(false);



  //chat contaienr ref..
  const chatcontainerRef = useRef(null)

//socket connection with the main server connections build
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



//scroll message  data
useEffect(() =>{
  if(chatcontainerRef.current){
    chatcontainerRef.current.scrollTop = chatcontainerRef.current.scrollHeight;
  }
}, [messages])

//Show all effect data
useEffect(() => {
  if(socket){
    fetchUserList();
    handleShowGroups(userId);
    // handleShowLength(userId);
    // handelGroupMessageLnegth(userId);
    handelGroupMessageLength(userId);
    // fetchLastMessage(userId);
    handleLastGroupMessage(userId);
    getUserName(userId);
  }
}, [socket, userId]);


  //show the file url
  const fileUrl = "http://localhost:5000/routes/uploads";

// Fetch user list from the API
const fetchUserList = () => {
  socket.emit('getUserList', userId);
  socket.on('userListResponse', (users) => {
    setUserlist(users); 
    fetchLastMessage(users); 
  });
  // Handle errors
  socket.on('error', (error) => {
    console.error('Error fetching user list:', error);
  });
};


//user handler event
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
  clearStoreMessage(user.user_id); 
  handleLeaveGroup(prevGroupId);
  fetchMessages(userId, user.user_id);
};





// Function to clear store message based on clearId
const clearStoreMessage = async (clearId) => {
  try {
    if (socket) {
      const payload = {
        userId,
        clearId
      };
      socket.off('clearMessagesResponse');
      socket.emit('clearMessages', payload);
      socket.on('clearMessagesResponse', (response) => {
        if (response.error) {
          console.error("Error clearing messages:", response.error);
        } else {
          if(!typingTrack){

            fetchMessages(userId, clearId);
          }
          handleShowLength(userId); 
        }
      });
    }
  } catch (error) {
    console.error("Error clearing messages:", error);
  }
};




//get username
const getUserName = (userId) => {
  socket.off('getUserNameResponse');
  socket.emit('getUserName', userId);
  socket.on('getUserNameResponse', (username) => {
    if (username) {
      setUserName(username);
    } else {
      console.error('User not found');
    }
  });
}


//get message data
const fetchMessages = (userId, receiverId) => {
  setMessages([]);
  socket.off('messages');
  socket.emit('getMessages', { userId, receiverId });
  socket.on('messages', (messages) => {
    setMessages(messages);
    setReplyingTo([]); 
});

  // Handle errors
  socket.on('error', (error) => {
    console.error("Error fetching messages:", error);
  });
};


//All messge data get
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
      if (
        newMessage &&
        parseInt(newMessage.sender_id, 10) === parseInt(checkId, 10)
      ) 
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

    const handleActiveUserList = (activeUsers) => {
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

  // Handle message length
  const handleShowLength = (userId) => {
    socket.emit('getMessageLength', userId);
    socket.on('messageLength', (messageCounts) => {
      setStoreMessage(messageCounts); 
    });
  
    // Handle any errors from the server
    socket.on('error', (error) => {
      console.error('Error fetching message length:', error);
    });
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


// Handle group list show
const handleShowGroups = (userId) => {
  socket.emit('getGroups', userId);
  socket.on('groupsResponse', (groups) => {
    // Update the state with the received groups
    setGroups(groups);  
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Error fetching groups:', error);
  });
};



{/* handle group data send */}
// Handle group data send 
const handleGroupClick = (group) => {
  try {
    setIsShow(true);
    setGetGroupId(group.group_id);
    setCurrentGroupId(group.group_id);
    setShowGroupName(group.group_name);
    setShow(false);
    setAnotherCondition(true);
    setMessages([]);
    setReceiverName([]);
    setActiveGroup(group.group_id);
    setReplyingTo([]);
    setCheckId(null);
    setInputValue("");
    socket.emit('getGroupMembers', group.group_id);
    socket.on('groupMembersResponse', (groupMembers) => {
      setSelectedGroup(groupMembers);
      handleJoinGroup(group.group_id);
    });
    handelGroupMessageRead(userId, group.group_id);
    // Handle errors
    socket.on('error', (error) => {
      console.error("Error fetching group members:", error);
    });

    // handleGetGroupMessages(group.group_id);

  } catch (error) {
    console.error("Error handling group click:", error);
  }
};

//Message send emmit one to one
const handleSendMessage = async (e) => {
  e.preventDefault();
  // Check if there's any input value or file
  if (!inputValue.trim() && (!Array.isArray(file) || file.length === 0)) {
    alert("Please type a message or select a file to send.");
    return;
  }

  if (!receiverId) {
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
    prevFile: replyingTo ? replyingTo.file_name : "",
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
  setPrevGroupId(null);  
};


//For checking the user id
const handleCheckId = (checkId) => {
  if (socket) {
    socket.emit("joinCheckId", checkId);
  }
};




//Group Message Recive all the user
useEffect(() => {
  if (socket) {
    const handleReceiveGroupMessage = (newMessage) => {
      if (newMessage.group_id === currentGroupId) {
        handelGroupMessageRead(userId, newMessage.group_id, newMessage.message_id);
        handleLastGroupMessage(userId);
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
        handelGroupMessageLength(userId);
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
}, [socket, currentGroupId, userId]);

  


// Function to fetch unread message length for the user
const handelGroupMessageLength = async (userId) => {
  try {
    socket.off('groupMessageLength');
    socket.emit('getGroupMessageLength', userId);
    socket.on('groupMessageLength', (data) => {
      setGroupMessageStore(data);  
    });

    // Handle error events
    socket.on('error', (error) => {
      console.error('Error fetching unread message length:', error);
    });
  } catch (error) {
    console.error('Error in handelGroupMessageLength:', error);
  }
};

  
// Handle group message read
const handelGroupMessageRead = async (userId, groupId, messageId) => {
  try {
    const logArray = groupMessageStore.filter(msg => msg.group_id === groupId);
    socket.emit('getGroupMessageRead', userId, groupId, messageId, logArray);
    // Listen for the 'groupMessageRead' event
    socket.on('groupMessageRead', (data) => {
      handelGroupMessageLength(userId);
      handleGetGroupMessages(groupId);
    });
    // Handle error events
    socket.on('error', (error) => {
      console.error('Error marking messages as read:', error);
    });

    // Clean up socket listeners after use
    return () => {
      socket.off('groupMessageRead');
      socket.off('error');
    };
  } catch (error) {
    console.error('Error in handelGroupMessageRead:', error);
  }
};




//get group messages
let lastFetchedGroupId = null; 
let isFetching = false;  
const handleGetGroupMessages = async (groupId) => {
  if (isFetching) {
    return;
  }
  if (lastFetchedGroupId === groupId) {
    return;  
  }
  lastFetchedGroupId = groupId;
  isFetching = true;
  try {
    setMessages([]);
    socket.emit('getGroupMessages', groupId);
    socket.once('groupMessages', (messages) => {
      setMessages(messages);  
      isFetching = false;  
    });
    socket.once('error', (error) => {
      console.error("Error fetching group messages:", error);
      isFetching = false;  
    });
  } catch (error) {
    console.error("Error in handleGetGroupMessages:", error);
    isFetching = false;
  }
};





useEffect(() => {
  if (socket) {
    const groupMessageVerifyRespone = (updatedMessageIds) => {
    };
    socket.on('groupMessageVerifyRespone', groupMessageVerifyRespone);
    return () => {
      socket.off('groupMessageVerifyRespone');
    };
  }
}, [socket]);


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

  if (!inputValue.trim() && (!Array.isArray(file) || file.length === 0)) {
    alert("Please type a message or select a file to send.");
    return;
  }

  if (!getGroupId) {
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
    prevFile: replyingTo ? replyingTo.file_name : "",
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

  setTypingTrack(true);

  const isTyping = e.target.value ? true : false; 

  if (isTyping) {
    if (getGroupId) {
      // If we are in a group chat, use groupId
      socket.emit('typing', {
        userId: userId,         
        groupId: getGroupId,       
        typing: true,           
        type: 'group', 
        username: userName         
      });
    } else if (receiverId) {
      // If it's a direct message, use receiverId
      socket.emit('typing', {
        userId: userId,        
        receiverId: receiverId, 
        typing: true,           
        type: 'user',  
        username: userName
      });
    }
  } else {
    // Stop typing, emit with typing: false
    if (getGroupId) {
      socket.emit('typing', {
        userId: userId,
        groupId: getGroupId,
        typing: false,          
        type: 'group',
        username: userName
      });
    } else if (receiverId) {
      socket.emit('typing', {
        userId: userId,
        receiverId: receiverId,
        typing: false,          
        type: 'user',
        username: userName
      });
    }
  }
};



// Listen for typing event
useEffect(() => {
  if (socket) {
    socket.on('userTyping', (data) => {
      if (data.type === 'group' && data.groupId === currentGroupId) {
        setTypingUser(data.username);
        setIsTyping(data.typing);
      } else if (data.type === 'user' && data.receiverId === parseInt(userId, 10)) {
        if (parseInt(data.userId, 10) === parseInt(checkId, 10)) {
          setTypingUser(data.username);
          setIsTyping(data.typing);
        } else {
        }
      }

      // Hide typing indicator after 3 seconds of inactivity
      if (data.typing) {
        setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });
  }

  return () => {
    if (socket) {
      socket.off('userTyping');
    }
  };
}, [checkId, socket, currentGroupId]); 


  
// reply to a message
const handleReplyClick = (message, file) => {
  if (file && message && message.files && message.files.length > 0) {
    const fileMatch = message.files.some(item => item.file_name === file.file_name);
    if (fileMatch) {
      // File matched, update the message with file information
      const updatedMessage = {
        ...message,
        replyInfo: {
          file_name: file.file_name,  
          sender_name: message.sender_name, 
          message_id: message.message_id,  
        }
      };
      setReplyingTo(updatedMessage.replyInfo); 
    }
  } else {
    const updatedMessage = {
      ...message,
      replyInfo: {
        file_name: "", 
        sender_name: message.sender_name, 
        message_id: message.message_id,
        content: message.content,
      }
    };
    setReplyingTo(updatedMessage.replyInfo); 
  }

  setInputValue(""); // Clear input field
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
    socket.emit('getLastMessagesByUser', userId, userIds);
    socket.on('lastMessagesByUser', (lastMessages) => {
      setLastMessages(lastMessages);
    });

    // Handle error events
    socket.on('error', (error) => {
      console.error("Error fetching last messages:", error);
    });
  } catch (error) {
    console.error("Error in fetchLastMessage:", error);
  }
};

//fetch the group message
const handleLastGroupMessage = (userId) => {
  try {
    socket.off('lastGroupMessages');
    socket.emit('getLastGroupMessage', userId);
    socket.on('lastGroupMessages', (lastMessages) => {
      setLastGroupMessage(lastMessages);
    });
    // Handle errors
    socket.on('error', (error) => {
      console.error("Error fetching last group message:", error);
    });

  } catch (error) {
    console.error("Error in handleLastGroupMessage:", error);
  }
};

// Download function
const handleDownload = async (fileName) => {
  try {
    const response = await fetch(`${fileUrl}/${fileName}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    // Create a blob from the response
    const blob = await response.blob();

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = "none";

    // Append link to body and click it
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error downloading the file:", error);
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
                            key={key}  
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
        
                                          // Assuming message.created_at is a valid date string
                                          const formattedDate = timeTracker(new Date(message.created_at)); 

                                          const content = message.content || '';  
                                          const show = content.length > 5;
                                          const truncatedContent = show ? content.slice(0, 5) + '...' : content;
                                          return (
                                            <div key={index} className="d-flex justify-content-between  gap-4">
                                              <p>{truncatedContent}</p>
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
                                        const content = message.content || '';  
                                        const show = content.length > 5;
                                        // Show only the first 5 characters followed by ellipsis if content length is greater than 5
                                        const truncatedContent = show ? content.slice(0, 5) + '...' : content;

                                        return (
                                          <div key={index}>
                                            <p>{truncatedContent}</p>
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

                                    {/* group message list*/}


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

              {/* Display Group Name  and List of Users */}
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
              <p>{isTyping && typingUser && <div className="text-green">{typingUser} is typing...</div>}</p>
              {/* Message Display Section */}
                <div
                className="flex-grow-1 overflow-auto border border-light rounded p-3 mb-2"
                style={{ height: "400px", backgroundColor: "#f1f1f1" }}
                ref={chatcontainerRef}
              >
                {messages.length > 0 ? (
                  messages.map((msg, index) => {
                    const isSender = parseInt(msg.sender_id, 10) === parseInt(userId, 10);
                    const formattedDate = formatDate(msg.timestamp);
                    const showDate =
                      index === 0 || formattedDate !== formatDate(messages[index - 1].timestamp);

                    return (
                      <div
                      key={msg.message_id}
                      className={`d-flex mb-3 ${
                        isSender ? "justify-content-end" : "justify-content-start"
                      }`}
                    >
                      {showDate && (
                        <div
                          style={{
                            width: "100%",
                            textAlign: "center",
                            margin: "10px 0",
                            fontSize: "0.8rem",
                            color: "#888",
                          }}
                        >
                          <p className="message-date">{formattedDate}</p>
                        </div>
                      )}
                    
                      <div
                        className="message-bubble p-3"
                        style={{
                          // backgroundColor: isSender ? "#007bff" : "#f0f0f0",
                          color: isSender ? "#fff" : "#000",
                          borderRadius: "15px",
                          maxWidth: "75%",
                          position: "relative",
                        }}
                        onMouseEnter={() => setHoverMessage(msg.message_id)}
                        onMouseLeave={() => setHoverMessage(null)}
                      >
                        {/* Displaying the Reply Button */}
                        {/* Reply Content */}

                        {/* Message Sender Name */}
                        <div style={{ fontWeight: "bold", marginBottom: "5px" , color: isSender ? "black" : "#000" }}>
                          {isSender ? "You" : msg.sender_name}
                        </div>

                        {msg.prevContent && (
                          <div
                            className="reply-content"
                            style={{
                              marginBottom: "10px",
                              padding: "10px",
                              backgroundColor: "#BEB8B8FF",
                              borderRadius: "5px",
                            }}
                          >
                            <strong>Replying to:</strong>
                            <p>{msg.rebackName}</p>
                            <p>{msg.prevContent}</p>
                          </div>
                        )}


                        {/* Message Content */}
                        <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "0" }}>
                          {msg.content && (
                            <li
                              style={{
                                backgroundColor: isSender ? "#007bff" : "#f0f0f0",
                                marginBottom: "10px",
                                padding: "4px",
                                position: "relative",
                              }}
                              onMouseEnter={() => setHoverMessage(msg.message_id)}
                              onMouseLeave={() => setHoverMessage(null)}
                            >
                              <div>
                                {msg.content && (
                                  <div>{msg.content}</div>
                                )}

                                {/* Only show the "reply" button if msg.content exists */}
                                {msg.content && (
                                  <button
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
                                    reply
                                  </button>
                                )}
                              </div>
                            </li>
                          )}
                          <li>
                            {msg.files && msg.files.length > 0 && (
                              <div>
                                {msg.files.map((file) => (
                                  <div
                                    key={file.file_id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      marginBottom: "10px",
                                      position: "relative",
                                    }}
                                    onMouseEnter={() => setHoverMessage(file.file_id)} 
                                    onMouseLeave={() => setHoverMessage(null)} 
                                  >
                                    {/* If the file is an image, display it */}
                                    {file.file_name && file.file_name.match(/\.(jpg|jpeg|png|gif)$/i) && (
                                        <div style={{ marginRight: "10px" }}>
                                          <img
                                            src={`${fileUrl}/${file.file_name}`}
                                            alt="Uploaded file"
                                            style={{
                                              maxWidth: "60px",
                                              maxHeight: "60px",
                                              borderRadius: "5px",
                                            }}
                                          />
                                        </div>
                                      )}

                                    {/* Display file name and Download button */}
                                    <div style={{ flexGrow: 1, marginLeft: "10px" }}>
                                      <Button
                                        onClick={() => handleDownload(file.file_name)}
                                        style={{
                                          backgroundColor: "#007bff",
                                          color: "#fff",
                                          border: "none",
                                          padding: "5px 10px",
                                          borderRadius: "5px",
                                          cursor: "pointer",
                                          fontSize: "14px",
                                          marginLeft: "10px",
                                        }}
                                        size="sm"
                                      >
                                        Download
                                      </Button>
                                    </div>

                                    {/* Reply button for each file */}
                                    <button
                                      style={{
                                        position: "absolute",
                                        left: isSender ? "0" : "auto",
                                        right: !isSender ? "0" : "auto",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        visibility: hoverMessage === file.file_id ? "visible" : "hidden",
                                      }}
                                      onClick={() => handleReplyClick(msg, file)}  
                                    >
                                      Reply
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        </ul>

                        {/* Message Status (read receipt) */}
                        <div className="d-flex align-items-center justify-content-between">
                          <div style={{ fontSize: "0.8rem", color: "black" }}>
                            {timeTracker(new Date(msg.timestamp))}
                          </div>
                          <div>
                            {msg.status === "check" ? (
                              <>
                                <i
                                  className="pi pi-check"
                                  style={{ color: "black" }}
                                  aria-label="Checked"
                                ></i>
                                <i
                                  className="pi pi-check"
                                  style={{ color: "black" }}
                                  aria-label="Checked"
                                ></i>
                              </>
                            ) : (
                              <i
                                className="pi pi-check"
                                style={{ color: "black" }}
                                aria-label="Not checked"
                              ></i>
                            )}
                          </div>
                        </div>
                      </div>
                      </div>
                    );
                  })
                ) : (
                  <div>No messages yet.</div>
                )}
                </div>
              {/* From Section */}
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
                      {replyingTo && replyingTo.sender_name &&  (
                        <div className="replying-to">
                          <div className="d-flex justify-content-between align-items-center">
                              <strong>Replying to:</strong> 
                              <i className="pi pi-times p-2" onClick={() => setReplyingTo(null)}></i>
                          </div>
                          <p className="p-0 m-0">{replyingTo.sender_name}</p>
                          <p className="px-4">{replyingTo.content}</p>

                          <div>
                            {(replyingTo.files && replyingTo.files.length > 0) ? (
                                <div className="mt-2">
                                  <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
                                    {replyingTo.files.map((file) => (
                                      <li
                                        key={file.file_id}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          marginBottom: "10px",
                                        }}
                                      >
                                        {file.file_name && (
                                          <>
                                            {/* If the file is an image, display it */}
                                            {file.file_name.match(/\.(jpg|jpeg|png|gif)$/i) && (
                                              <img
                                                src={`${fileUrl}/${file.file_name}`}
                                                alt="Uploaded file"
                                                style={{
                                                  maxWidth: "40px",
                                                  maxHeight: "40px",
                                                  marginRight: "10px",
                                                }}
                                              />
                                            )}
                                          </>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (replyingTo.file_name && (
                                <div className="mt-2">
                                  <ul style={{ listStyleType: "none", paddingLeft: "0" }}>
                                    <li
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        marginBottom: "10px",
                                      }}
                                    >
                                      {/* Display file if file_name is directly in replyingTo */}
                                      {replyingTo.file_name.match(/\.(jpg|jpeg|png|gif)$/i) && (
                                        <img
                                          src={`${fileUrl}/${replyingTo.file_name}`}
                                          alt="Uploaded file"
                                          style={{
                                            maxWidth: "40px",
                                            maxHeight: "40px",
                                            marginRight: "10px",
                                          }}
                                        />
                                      )}
                                    </li>
                                  </ul>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      <Form.Control
                        type="text"
                        placeholder="Type a message..."
                        value={inputValue}
                        // onChange={(e) => setInputValue(e.target.value)}
                        onChange={handleInputChange}
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
                                  maxHeight: "30px",
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
                              style={{ fontSize: "16px", color: "#dc3545" }} 
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
                    // disabled={
                    //   (receiverName && !getGroupId ? !receiverId : !getGroupId) ||
                    //   !inputValue
                    // }
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
          <Card  className="p-shadow-24 p-mb-4 p-p-3">
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
