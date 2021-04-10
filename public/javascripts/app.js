
new Vue({
    el: '.app-content',
    data: {
        yourSelection:null,
        theirSelection:null,
        result:null,
        winner:null,
        loser:null,
        socket: null,
        uniqueIdentifier: null,
        yourName: '',
        opponentKey: null,
        opponentName: '',
        waitingForUserToApproveRequest: false,
        inGame: false,
        availableUsers:[],
        users: [],
        winnerSayings: {
            spock:{
                scissors:'Spock smashes scissors',
                rock:'Spock vaporizes rock',
            },
            rock:{
                scissors:'Rock smashes scissors',
                lizard:'Rock crushes lizard'
            },
            lizard:{
                paper:'Lizard eats paper',
                spock:'Lizard poisons Spock'
            },
            scissors:{
                lizard:'Scissors decapitate lizard',
                paper:'Scissors cut paper',
            },
            paper:{
                rock:'Paper covers rock',
                spock:'Paper disproves spock'
            }
        },
        wins:0,
        losses:0,
        gameTimeLeft:5,
        strongAgainst: {
            rock: ['scissors', 'lizard'],
            lizard: ['spock', 'paper'],
            scissors: ['paper', 'lizard'],
            paper: ['spock', 'rock'],
            spock: ['scissors', 'rock'],
        },
        weakAgainst: {
            rock: ['spock', 'paper'],
            lizard: ['rock', 'scissors'],
            scissors: ['rock', 'spock'],
            paper: ['lizard', 'scissors'],
            spock: ['paper', 'lizard'],
        },

    },
    computed: {
    },
    methods: {
        cancelRequest: function(value) {
            this.inGame = false;
            this.result = '';
            this.yourSelection = null;
            this.theirSelection = null;
            this.waitingForUserToApproveRequest = false;
            this.socket.emit('cancelRequest', [value, this.opponentKey]);
        },
        confirmPlay: function () {
            this.socket.emit('confirmRequest', [this.uniqueIdentifier, this.opponentKey]);
        },
        requestOpponent: function(userInfo) {
            if (userInfo.inGameWith) {
                return;
            }
            this.opponent = userInfo.name;
            this.waitingForUserToApproveRequest = true;
            
            this.socket.emit('makeRequest', { id:this.uniqueIdentifier, opponentID: userInfo.id });
        },
        isWeakAgainst: function(item) {
            if (this.yourSelection &&
                this.weakAgainst[this.yourSelection]) {
                    return this.weakAgainst[this.yourSelection].includes(item);
            }
            return false;
        },
        isStrongAgainst: function(item) {
            if (this.yourSelection &&
                this.strongAgainst[this.yourSelection]) {
                    return this.strongAgainst[this.yourSelection].includes(item);
            }
            return false;
        },
        speak(thePhrase) {
            if ('speechSynthesis' in window) {
                const msg = new SpeechSynthesisUtterance();
                msg.text = thePhrase;
                window.speechSynthesis.speak(msg);
            }
        },
        changeSelection(selection) {
           if (this.gameTimeLeft > 0) {
            this.yourSelection = selection;
            this.speak(`You chose ${selection}`);
           } 
        },
        whoWins: function() {
            
            const strongAgainst = this.strongAgainst[this.yourSelection] || [];
            const weakAgainst = this.weakAgainst[this.yourSelection] || [];
            if ((!this.theirSelection && this.yourSelection) || strongAgainst.includes(this.theirSelection)) {
                this.result = 'You win!';
                this.wins++;
                this.winner = this.yourSelection;
                this.loser = this.theirSelection;
            } else if (weakAgainst.includes(this.theirSelection) || (!this.yourSelection && this.theirSelection)) {
                this.result = `Sorry, ${this.opponentName || 'your opponent'} won`;
                this.losses++;
                this.winner = this.theirSelection;
                this.loser = this.yourSelection;
            } else {
                this.result = 'Tie!';
                this.winner = null;
                this.loser = null;
            }
            this.speak(this.result);
            if (this.winner && this.loser && this.winnerSayings[this.winner] && this.winnerSayings[this.winner][this.loser]) {
                this.speak(this.winnerSayings[this.winner][this.loser]);
            }
        },
        updateName: function() {
            this.socket.emit('name', this.yourName);
        },
        updateUsers: function(val) {
            this.availableUsers = [];
            for (const user of val) {
                if (user.id === this.uniqueIdentifier) {
                    if (!this.inGame && user.inGame) {
                        this.yourSelection = null;
                        this.result = '';
                        this.yourSelection = null;
                        this.theirSelection = null;
                        this.gameTimeLeft = 5;
                    }
                    this.inGame = user.inGame;
                    this.opponentKey = user.inGameWith;
                } else {
                    this.availableUsers.push(user);
                }
                if (user.inGameWith === this.uniqueIdentifier) {
                        this.opponentKey = user.id;
                        this.opponentName = user.name;
                }
            }

            if (this.inGame || !this.opponentKey) {
                this.waitingForUserToApproveRequest = false;
            }
        },
        updateTimeRemaining: function () {
            if (this.gameTimeLeft > 0) {
                this.gameTimeLeft--;
            } else if (this.inGame && !this.result) {
                this.socket.emit('myVal', {id:this.uniqueIdentifier, result: this.yourSelection});
            }
        },
        updateOpponentResult: function (obj) {
            const { id, result } = obj;
            
            if (id === this.opponentKey) {
                this.theirSelection = result;
                this.whoWins();
            }
        }
    },
    mounted() {
        this.uniqueIdentifier = Math.random().toString(36).substring(7);
        this.socket = io("http://localhost:3000/", {query:`id=${this.uniqueIdentifier}`});

        this.socket.on('broadcast', this.updateUsers);
        this.socket.on('dd', this.updateTimeRemaining);
        this.socket.on('opponentResult', this.updateOpponentResult);
    }
});

