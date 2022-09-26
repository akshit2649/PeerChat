const APP_ID = 'c5e77c22bc6a4acbb78e9f6eaca3282e';
const token = null;
const uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
};
//The STUN server allows clients to find out their public address

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });
  channel = client.createChannel('main');
  await channel.join();
  channel.on('MemberJoined', handleUserJoined);
  client.on('MessageFromPeer', handleMessageFromPeer);
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  document.getElementById('user-1').srcObject = localStream;
};

let handleMessageFromPeer = async (message, MemberId) => {
  message = JSON.parse(message.text);
  console.log('Message ->', message);
};

let handleUserJoined = MemberId => {
  console.log('A new user joined the channel: ', MemberId);
  createOffer(MemberId);
};

let createOffer = async MemberId => {
  //return a newly created connection which represents
  //connections between the local device and remote peer
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream(); //returns a new media stream
  document.getElementById('user-2').srcObject = remoteStream;

  //Associating track with specific stream
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById('user-1').srcObject = localStream;
  }
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  //setLocalDescription will fire this function
  peerConnection.onicecandidate = async event => {
    if (event.candidate) {
      client.sendMessageToPeer(
        { text: JSON.stringify({ type: 'candidate', offer: event.candidate }) },
        MemberId
      );
    }
  };
  //initiates the creation of an SDP offer
  //for the purpose of starting a new WebRTC connection to a remote peer
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer); //set the properties of the local end of the connection

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: 'offer', offer: offer }) },
    MemberId
  );
};

init();
