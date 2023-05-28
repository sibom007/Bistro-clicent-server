const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('res is run');
})
//   bisto
// weDOS5qDEPQWxl80




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

    const Bistrocollaction = client.db("Bistro").collection("Manu");
    const ratingcollaction = client.db("Bistro").collection("Rating");
    const addcardcollaction = client.db("Bistro").collection("addcard");


    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }
      const query = { email: email }
      const result = await addcardcollaction.find(query).toArray();
      res.send(result)
    })

    app.get('/manu', async (req, res) => {
      const result = await Bistrocollaction.find().toArray();
      res.send(result);
    })

    app.get('/rating', async (req, res) => {
      const result = await ratingcollaction.find().toArray();
      res.send(result);
    })


    app.post('/addcard', async (req, res) => {
      const item = req.body;
      const result = await addcardcollaction.insertOne(item)
      res.send(result);
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