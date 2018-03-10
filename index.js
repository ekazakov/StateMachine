// Simple state machine idea
// for better separation of concerns
// http://raganwald.com/2018/02/23/forde.htm
const STATE = Symbol("state");
const STATES = Symbol('states');
const STARTING_STATE = Symbol('starting-state');

const noop = () => {};
function transitionTo(stateName, fn = noop) {
    return function(...args) {
        const returnValue = fn.apply(this, args);
        this[STATE] = this[STATES][stateName];
        console.log(`Transition to state: ${stateName}`);
        return returnValue;
    };
}

function StateMachine(description) {
    const RESERVED = [STARTING_STATE, STATES];
    const machine = {};

    // Handle all the initial states and/or methods
    const propertiesAndMethods = Object
        .keys(description)
        .filter(prop => !RESERVED.includes(prop))
    ;

    for (const prop of propertiesAndMethods) {
        machine[prop] = description[prop];
    }

    machine[STATES] = description[STATES];

    const eventNames = Object
        .entries((description[STATES]))
        .reduce((eventNames, [state, stateDescription]) => {
            const eventNamesForThisState = Object.keys(stateDescription);

            for (const eventName of eventNamesForThisState) {
                eventNames.add(eventName);
            }
            return eventNames;
        }, new Set())
    ;

    // define the delegating methods

    for (const eventName of eventNames) {
        machine[eventName] = function (...args) {
            const handler = this[STATE][eventName];

            if (typeof handler === 'function') {
                return this[STATE][eventName].apply(this, args);
            }

            console.log(`>>> invalid event ${eventName}`);
        };
    }

    machine[STATE] = description[STATES][description[STARTING_STATE]];

    return machine;
}

const account = StateMachine({
    balance: 0,

    [STARTING_STATE]: 'open',
    [STATES]: {
        open: {
            deposit(amount) {
                this.balance = this.balance + amount;
                console.log('increase balance by:', amount);
            },
            withdraw(amount) {
                this.balance = this.balance - amount;
                console.log('decrease balance by:', amount);
            },
            placeHold: transitionTo('held'),
            close: transitionTo('closed', function () {
                if (this.balance) {
                    console.log('transfer balance to suspension account');
                }
            })
        },
        held: {
            removeHold: transitionTo('open'),
            deposit(amount) {
                this.balance = this.balance + amount;
                console.log('increase balance by:', amount);
            },            
            close: transitionTo('closed', function () {
                if (this.balance > 0) {
                    console.log('transfer balance to suspension account');
                }
            })
        },
        closed: {
            reopen: transitionTo('open', function () {
                console.log('restore balance if applicable');
            })
        }
    }
});

console.log('Initial state: open');
account.deposit(100);
account.placeHold();
account.placeHold();
account.close();
account.reopen();