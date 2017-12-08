/*

$ npm install -g firebase-tools

Initiate your project:
$ firebase init

Deploy your functions:
$ firebase deploy

*/

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

function getRandomIntInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min; 
}

function createUniqueActivationCode(event){
    //genere le code
    const randomCode = getRandomIntInclusive(10000,99999);
    let unique = false;
    //check si le unique code existe
}

exports.createInvitation = functions.firestore
	.document('invites/{inviteId}')
	.onCreate((event) => {
		//on va generer un code
		const randomCode = getRandomIntInclusive(10000,99999);
		const inviteId = event.params.inviteId;
		//on va mettre une nouvelle collection ce qui va eviter de trigger activateInvitation
		//car avec firestore on ne peut pas mettre de trigger sur un single field
		//on va le mettre dans la collection invites
		return db.collection('invites').doc(inviteId)
			.update({
				code:randomCode
			})
			.then(() => {
				console.log("code: " + inviteId + " --> " + randomCode);
				return randomCode;
            })
            .catch((err) => {
                console.log(err);
            });
	});

exports.activateInvitation = functions.firestore
	.document('invites/{inviteId}/state/{userId}')
	.onCreate((event) => {
        //le userID de celui qui accepte l'invitation
        const userA = event.params.userId; //2UT3SOpMxPOfAPrTFUwWTswAA0l1
        if(userA == null || userA == ""){
            return false;
        }
        //le userID de celui qui a envoye l'invitation
        //le inviteId
        const inviteId = event.params.inviteId; //PC6L4STvnhjqpI3Y94az
        const userB = event.data.data().from; //0CDFrsffJKbmVnU2St3NIQd0yOe2
        if(userB == null || userB == "" || inviteId == null || inviteId == ""){
            return false;
        }
        //sinon
        //on va chercher les infos de l'invitation
        const invitesRef = db.collection('invites').doc(inviteId); 
        const userRefA = db.collection('users').doc(userA);
        const userRefB = db.collection('users').doc(userB);
        //get l'invitations
        return userRefB.collection('invitations').doc(inviteId)
            .get()
            .then((doc) => {
                let data = doc.data();
                console.log("get invitation: " + inviteId);
                return {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    uid: userA,
                    gps: false,
                    status: 0,
                    position: new admin.firestore.GeoPoint(0.0, 0.0),
                    updateTime: admin.firestore.FieldValue.serverTimestamp()
                };
            })
            .then((result) => {
                console.log("set watchers: " + userB);
                //on va setter le watchers du user B
                return userRefB.collection('watchers').doc(userA).set(result);
            })
            .then(() =>{
                console.log("get infos: " + userA);
                //on va chercher les infos rentrer par le userA
                return invitesRef.collection('infos').doc(userA).get()
            })
            .then((doc) => {
                return doc.data();
            })
            .then((result) => {
                console.log("set watchings: " + userA);
                //on va setter le watching du user A
                return userRefA.collection('watchings').doc(userB).set({
                    name: result.name,
                    email: result.email,
                    phone: result.phone,
                    uid: userB,
                    gps: false,
                    status: 0,
                    position: new admin.firestore.GeoPoint(0.0, 0.0),
                    updateTime: admin.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                console.log("delete users invitation: " + inviteId);
                //on peut supprimer le invitation maintenant
                return userRefB.collection('invitations').doc(inviteId).delete();
            })
            .then(() =>{
                console.log("delete invites[infos]: " + inviteId);
                //on peut supprimer le invite et les subcollections
                return invitesRef.collection('infos').doc(userA).delete()
            })
            .then(() =>{
                console.log("delete invites[state]: " + inviteId);
                return invitesRef.collection('state').doc(userA).delete();
            })
            .then(() =>{
                console.log("delete invites: " + inviteId);
                return invitesRef.delete();    
            })
            .catch((err) => {
                console.log(err);
            });
	});

