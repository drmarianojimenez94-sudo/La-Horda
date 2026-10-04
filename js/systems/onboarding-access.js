"use strict";
// A navigation/progression gate, NOT purchase or anti-cheat authorization.
(function(root){
  const ready=save=>!!(save && save.tut && (save.tut.training===1 || save.tut.trainingSkipped===1));
  function storedReady(){
    try{return ready(JSON.parse(localStorage.getItem('laHordaSave_v1')));}catch{return false;}
  }
  root.HordaOnboarding={ready,storedReady};
})(window);
