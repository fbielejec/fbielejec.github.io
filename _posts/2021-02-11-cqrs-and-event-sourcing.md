---
layout: post
title: CQRS and Event Sourcing
author: Filip Bielejec
comments: true
categories: [rust, kafka, cqrs, event sourcing, event streaming, messaging]
summary: "."
---

# <a name="tldr"/> TL;DR

In this I will go over an architectural pattern that is a part of a broader spectrum of event based architectures.
It is inspired by a [StrangeLoop talk by Bobby Calderwood](https://www.youtube.com/watch?v=B1-gS0oEtYc).

Companion repository can be found here: [with-kafka](https://github.com/fbielejec/with-kafka).

# <a name="name"/> CQRS and Event Sourcing: what's in the name?

CQRS (Command/Query Responsibility Segregation) is a pattern which separates writes from the reads.
In another words updating information uses a different model that reading that information, as opposed to the prevalent [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) APIs, where the same view of your data is being used throughout.

This separation of concerns fits many domains, albeit [not all](https://martinfowler.com/bliki/CQRS.html).
Note that the separation says nothing of how these two models communicate - they may take entirely different paths in your system and run on a different hardware, or they may even share the same database and the same process.
The advantage is still the same : by separating reads from the writes you can evolve them in and independent manner.

---
**NOTE**

If you think that the [GraphQL](https://graphql.org/) language bears some compatibility, you will be right, although I would argue that the semantical split between *qutations* and *queries* is not enough to constitute a real separation.
Therefore depending on the details of a GrapQL based system we could (or could not) be talking of fitting the description of CQRS.
---

As already mentioned CQRS makes for a good fit with event-based architectures.
The read/write model separation, that is the defining pillar of CQRS, allows to combine it with the other hero of this blog entry title: the [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) pattern.

The idea of this pattern is that every state changing action in your system is recorded and stored in a time-ordered event log, rather than as an aggregate of all the changes as they were happening over time.
The advantages are three-fold:
- There is now an audit log of everything that happened in the system at any given point in time.
- The aggregate views of your events (persisted in e.g. relational data-base) can be now recreated by replaying those events one-by-one.
- By constructing the materialized view of the data **after** the event is stored, we can change our interpretation of it in the future, or even construct different aggregates of those events and server them concurrently to the clients.

Astute reader might observe that Event Sourcing defined above *de facto* must separate read from the write paths, and that is correct.
Therefore we could be talking of systems utlizing *just* the CQRS pattern, but not about systems utilizing Event Sourcing (ES).

# <a name="implementation"/> Implementation

For some people, and I definitely subscribe to that camp, it is easier to be learning something by practicing it.
Therefore after reading I decided to create a model (not built to scale nor painted) which implements this concepts.

Our domain will be a distributed calculator of sorts, because it is fairly easy to reason about as well as assert the correctness of what it is doing.
Below a simplified diagram of the system:

![_config.yml]({{ site.baseurl }}/images/2021-02-11-cqrs-and-event-sourcing/architecture_diagram.png)

As an entry point we have a web service, exposing various endpoints.
In the said application the API utlizes [REST + HTTP/JSON](https://en.wikipedia.org/wiki/Representational_state_transfer), but it could just as easily be a (already mentioned) GraphQL API.

The Commander component is responsible for:
- Accepting commands / mutations (client intentions).
- Light schema validation.
- Authorization.

It writes Commands (intentions) to the dedicated [Kafka](https://kafka.apache.org/) topic. Our system supports two commands:

#+BEGIN_SRC json
{"id"        : <Uuid>,
 "action"    : "CreateValue,
 "data"      : {"value-id": <UUID>,
                "value": <float>}
 "timestamp" : <Timestamp>}
#+END_SRC

#+BEGIN_SRC json
{"id"        : <Uuid>,
 "action"    : "UpdateValue",
 "data"      : {"value-id": <UUID>,
                "operation": <ADD / MULTIPLY>,
                "value": <float>}
 "timestamp" : <Timestamp>}
#+END_SRC

So we can create a value, add or multiply a value by some constant and retrieve it's current aggregate value.
An over-engineered calculator to put it simply.

The said **commands** topic is consumed by a Command Processor, a central component that:
- Implements business logic to validate Commands and check whether Events can be emitted.
- Sends *Events* to the **events** topic.

*Events* are state affecting, and following the convention by Bobby Calderwood are using past tense for their action field, therefore a `CreateValue` *Command*, after being validated, will result in a `ValueCreated` *Event* being emitted, which carries the id of the *Command* that it derives from:

#+BEGIN_SRC json
{"id"        : <Uuid>,
 "parent-id" : <Uuid>,
 "action"    : "ValueCreated",
 "data"      : {"value-id": <UUID>, "value": <float>}
 "timestamp" : <Timestamp>}
#+END_SRC

The emitted events are consumed by what the diagram collectively refers to as the `events consumers`.
These microservices are generating read optimized aggregate views of the data.
They are free to share the same database or each keep it's own, they can subscribe to re-partitioned events or vanilla topic, write to and communicate using additional topics etc.
Main point being there is now an infinite number of ways to materialize a view of your data stored as events.

There is also a subscriptions component, where clients can listen to for the status of their commands.

# <a name="runit"/> Let's see it in action

If you fork the [repository](https://github.com/fbielejec/with-kafka) there is a `docker-compose.yml` file at the root that you can use to get a kafka broker and zookeper started:

#+BEGIN_SRC bash
docker-compose -f docker-compose.yml up
#+END_SRC

Compile and boot the system. For

#+BEGIN_SRC bash
cargo run
#+END_SRC

Send your first command:

#+BEGIN_SRC bash
curl -d '{"value": 3}' -H "Content-Type: application/json" -X POST http://localhost:3030/values
#+END_SRC

Here are the logs from all the components, we can see the path that the message takes:

#+BEGIN_SRC
[2021-02-11T18:31:55Z INFO  with_kafka::command_processor] Received command: CreateValue {
        id: 7037a79d-7e6b-4969-9ea5-6d5c28605ac4,
        data: Value {
            value_id: d35e95f5-2a7a-4c31-8d28-2eb92643a154,
            value: 3.0,
        },
    }, partition: 0, offset: 2, timestamp: CreateTime(1613068185765)
[2021-02-11T18:31:55Z INFO  with_kafka::command_processor] validating command 7037a79d-7e6b-4969-9ea5-6d5c28605ac4 with data Value { value_id: d35e95f5-2a7a-4c31-8d28-2eb92643a154, value: 3.0 }
[2021-02-11T18:31:55Z INFO  with_kafka::command_processor] Succesfully sent event ValueCreated {
        id: ed94c20c-abe2-4d62-9cc7-904b266ed37a,
        parent: 7037a79d-7e6b-4969-9ea5-6d5c28605ac4,
        data: Value {
            value_id: d35e95f5-2a7a-4c31-8d28-2eb92643a154,
            value: 3.0,
        },
    } to topic events
[2021-02-11T18:31:55Z INFO  with_kafka::materialized_view] Received event: ValueCreated {
        id: ed94c20c-abe2-4d62-9cc7-904b266ed37a,
        parent: 7037a79d-7e6b-4969-9ea5-6d5c28605ac4,
        data: Value {
            value_id: d35e95f5-2a7a-4c31-8d28-2eb92643a154,
            value: 3.0,
        },
    }, partition: 0, offset: 7, timestamp: CreateTime(1613068315632)
#+END_SRC

Command Processor receives the command, validates it (checks if the value with this id does not already exist), and sends and Event, that is then processed by a view component.

So what happens if we send a `MULTIPLY` commands for a value that does not exist?

#+BEGIN_SRC bash
curl -d '{"operation": "MULTIPLY", "value": 3}' -H "Content-Type: application/json" -X PUT http://localhost:3030/values/ffffffff-ffff-ffff-ffff-ffffffffffff
#+END_SRC

Processor rejects it and no event is generated:

#+BEGIN_SRC
[2021-02-11T18:36:42Z INFO  with_kafka::command_processor] Received command: UpdateValue {
        id: b694cc37-7657-4d27-97f5-e8f800ef05c4,
        data: UpdateOperation {
            value_id: ffffffff-ffff-ffff-ffff-ffffffffffff,
            operation: MULTIPLY,
            value: 3.0,
        },
    }, partition: 0, offset: 3, timestamp: CreateTime(1613068602444)
[2021-02-11T18:36:42Z INFO  with_kafka::command_processor] validating command b694cc37-7657-4d27-97f5-e8f800ef05c4 with data UpdateOperation { value_id: ffffffff-ffff-ffff-ffff-ffffffffffff, operation: MULTIPLY, value: 3.0 }
[2021-02-11T18:36:42Z ERROR with_kafka::command_processor] command b694cc37-7657-4d27-97f5-e8f800ef05c4 rejected: value with id ffffffff-ffff-ffff-ffff-ffffffffffff does not exist
#+END_SRC

And if we now send a valid command and query for the value current state:

#+BEGIN_SRC bash
curl -d '{"operation": "MULTIPLY", "value": 3}' -H "Content-Type: application/json" -X PUT http://localhost:3030/values/d35e95f5-2a7a-4c31-8d28-2eb92643a154
curl -H "Content-Type: application/json" -X GET http://localhost:3030/values/d35e95f5-2a7a-4c31-8d28-2eb92643a154
#=> {"value_id":"d35e95f5-2a7a-4c31-8d28-2eb92643a154","value":9.0}
#+END_SRC

To demonstrate the replay-ability all state is kept in-memory and the Command Processor is configures to read from offset 0 (from the beginning of the topic).
Therefore you can kill the process in which the components run and start it again to get the same state.
