require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose");
const md5= require("md5")
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { stringify } = require("querystring");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect( process.env.DBPATH, {useUnifiedTopology: true, useNewUrlParser: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: []
});

userSchema.plugin(passportLocalMongoose); //hashing and salting

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
    res.render("home");
})

app.get("/login", function(req, res){

    if(req.isAuthenticated()){

        res.redirect("/secrets");
    }
    else
        res.render("login");
})

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})

app.get("/register", function(req, res){
    res.render("register");
})

app.get("/secrets", function(req, res){

 
    if(req.isAuthenticated()){

        User.find({secret: {$ne:null}}, function(err, users){
            if(err)
                console.log(err);
            else
            {
                if(users)
                {
                    res.render("secrets", {usersWithSecrets:users});
                }
            } 
        })
    }
    else
        res.redirect("/login");
})

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else
        res.redirect("/login");
})

app.post("/submit", function(req,res){

    const submittedSecret=req.body.secret;
    User.findById(req.user.id, function(err,foundUser){
        if(err)
            console.log(err);
        else
        {
            if(foundUser)
            {
                foundUser.secret.push(submittedSecret);
                foundUser.save(function(){
                    res.redirect("/secrets");
                })
            }
        }
    })
})

app.post("/register", function(req,res){

    User.register({username: req.body.username}, req.body.password, function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
})

app.post("/login", function(req,res){

    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user, function(err){
        if(err)
            console.log(err);
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })

})


app.listen( process.env.PORT || 3000, function(){
    console.log("Server is up and running at Port : 3000");
})

app.get('*', function(req, res){
    res.send("<h1>404 Error</h1>", 404);
});