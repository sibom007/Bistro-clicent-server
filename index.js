const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.PAYMENT_GATAY)


app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ASSCES_TOKEN_SECRET, (err, decoded) => {

    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access 2' })
    }
    req.decoded = decoded;
    next();
  })
}




app.get('/', (req, res) => {
  res.send('res is run');
})






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lgfbklm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection


    const usercollaction = client.db("Bistro").collection("user");
    const Manucollaction = client.db("Bistro").collection("Manu");
    const ratingcollaction = client.db("Bistro").collection("Rating");
    const addcardcollaction = client.db("Bistro").collection("addcard");
    const paymentCollection = client.db("Bistro").collection("payments");

    //----------------------jwt token---------------------//

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ASSCES_TOKEN_SECRET, { expiresIn: '5h' })

      res.send({ token })
    })


    // Warning: use verifyJWT before using verifyAdmin



    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usercollaction.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    //----------------------user all data-------------------------------------------//

    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usercollaction.find().toArray()
      res.send(result)
    })



    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existinguser = await usercollaction.findOne(query)
      if (existinguser) {
        return res.send({ message: 'user alredy exist' })
      }
      const result = await usercollaction.insertOne(user)
      res.send(result)
    })


    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usercollaction.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await usercollaction.updateOne(filter, updateDoc);
      res.send(result)
    })
    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usercollaction.deleteOne(query);
      res.send(result)
    })





    //---------------------------carts data------------------------//
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'porviden access' })
      }

      const query = { email: email }
      const result = await addcardcollaction.find(query).toArray();
      res.send(result)
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addcardcollaction.deleteOne(query);
      res.send(result)
    })


    //--------------------------manu related-----------------//
    app.get('/manu', async (req, res) => {
      const result = await Manucollaction.find().toArray();
      res.send(result);
    })

    app.post('/manu', async (req, res) => {
      const Newmanu = req.body
      const result = await Manucollaction.insertOne(Newmanu)
      res.send(result)
    })


    app.delete('/manu/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await Manucollaction.deleteOne(query);
      res.send(result)
    })

    //---------------------rating related--------------------//
    app.get('/rating', async (req, res) => {
      const result = await ratingcollaction.find().toArray();
      res.send(result);
    })

    //----------------add all cords----------------------//
    app.post('/addcard', async (req, res) => {
      const item = req.body;
      const result = await addcardcollaction.insertOne(item)
      res.send(result);
    })

    //----------------------create payment gatway--------------------------//

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    //--------------------------payment relatede-----------------------//
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await addcardcollaction.deleteMany(query)

      res.send({ insertResult, deleteResult });
    })

    //-------------------admin home data-------------------//

    app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
      const users = await usercollaction.estimatedDocumentCount();
      const products = await Manucollaction.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // best way to get sum of the price field is to use group and sum operator
      /*
        await paymentCollection.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: '$price' }
            }
          }
        ]).toArray()
      */

      const payments = await paymentCollection.find().toArray();
      const revenues = payments.reduce((sum, payment) => sum + payment.price, 0)
      const revenue = revenues.toFixed(2)
      console.log(revenue);

      res.send({
        revenue,
        users,
        products,
        orders
      })
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.listen(port, () => {
  console.log(`res is on ${port}`);
})