const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');
require('dotenv').config()

const PORT = process.env.PORT || 3000
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"))

//new connection to database called todolistDB
mongoose.connect("mongodb+srv://"+process.env.USER+":"+process.env.PASSWORD+"@exploring.r3uerjx.mongodb.net/todolistDB", { useNewUrlParser: true, useUnifiedTopology: true });

//making a schema for items
const itemsSchema = new mongoose.Schema({
        name: String
})

//making a collection called Item based on the itemsSchema
const Item = mongoose.model("Item", itemsSchema);

//making new documents in the Item collection
const item1 = new Item({
        name: "Welcome to your to-do list"
});
const item2 = new Item({
        name: "What are your tasks for today?"
});
const item3 = new Item({
        name: "hit + to add new tasks"
});

//an array containing our default items
const defaultItems = [item1, item2, item3];

//making a schema for lists
const listsSchema = new mongoose.Schema({
        name: String,
        items: [itemsSchema]
});

//making a collection called List based on listsSchema
const List = mongoose.model("List", listsSchema);

//handling get requests for home route
app.get("/", function (req, res) {

        Item.find({}).exec()
                .then((foundItems) => {
                        if (foundItems.length === 0) {

                                //inserting the default items into the collection "Item" if the list is empty
                                Item.insertMany(defaultItems)
                                        .then(function () {
                                                console.log("Successfully saved into our DB.");
                                        })
                                        .catch(function (err) {
                                                console.log(err);
                                        });
                                //redirecting back to home route so that the else statement could execute and list can be displayed
                                res.redirect("/");

                        } else {
                                //displays list
                                res.render("list", { listTitle: "Today", newListItems: foundItems })
                        }
                })
                .catch((err) => {
                        console.log(err);
                })

});

app.post("/", function (req, res) {

        //new task that is entered in our todolist
        const itemName = req.body.newItem;
        const listName = req.body.list;

        //making a document for that new task inside our collection "Item"
        const item = new Item({
                name: itemName
        });

        if (listName === "Today") {
                //saving the document
                item.save();

                //redirecting to the home route so that the new list can be shown
                res.redirect("/");
        } else {

                //we need to find the custom list first and then save the item in that custom list
                List.findOne({ name: listName }).exec()
                        .then((foundList) => {
                                foundList.items.push(item);
                                foundList.save();

                                //redirecting to the custom list
                                res.redirect("/" + listName);
                        })
                        .catch((err) => {
                                console.log(err);
                        });

        }

})


//this post route will handle delete requests
app.post("/delete", function (req, res) {

        //stores the _id of checked-off task
        const checkedItemID = req.body.checkbox;
        //stores the name of the list from where the checkedItemID came from
        const listName = req.body.listName;

        //checking if the list is our main list from home page, else it's a custom list
        if (listName === "Today") {
                //Find the task with this _id and remove it from todolist
                Item.findByIdAndRemove({ _id: checkedItemID }).exec()
                        .then(function () {
                                console.log("Successfully deleted from database");
                                res.redirect("/");
                        })
                        .catch(function (err) {
                                console.log(err);
                        })
        } else {
                //for the custom lists we will find the list and update it's array of items
                List.findOneAndUpdate({ name: listName }, { $pull: { items: {_id: checkedItemID } } }).exec()
                        .then(() => {
                                res.redirect("/" + listName);
                        })
                        .catch((err) => {
                                console.log(err);
                        })
        }

})

//we are doing dynamic routing here. 
//listType is the type of list we wanna make like grocery list, work list etc
app.get("/:listType", function (req, res) {
        const listType = _.capitalize(req.params.listType);

        //looking for a document with name: listType in the List collection
        List.findOne({ name: listType }).exec()
                .then((foundList) => {
                        if (!foundList) {
                                //if already existing list not found
                                //then we will make a new list document inside the List collection
                                const list = new List({
                                        name: listType,
                                        items: defaultItems
                                });
                                list.save();

                                //redirect to the else block so our list can be rendered and displayed
                                res.redirect("/" + listType)

                        } else {
                                //if found an already existing list
                                //then we will simply show it 
                                res.render("list", { listTitle: foundList.name, newListItems: foundList.items })
                        }
                })
                .catch((err) => {
                        console.log(err);
                });

})

app.get("/about", function (req, res) {
        res.render("about");
});


app.listen(PORT, function () {
        console.log("Server started on port "+ PORT);
});
