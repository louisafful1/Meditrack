  // utils.js
export const validateEmail = (email) => {
  
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  }
  
  // Shorten Text
export const ShortenText = (text, n) => {
  if(text.length > n) {
    const shortenedText =text.substring(0, n).concat("...");
    return shortenedText;
  }
  return text
};

// export const FacilityName = () => {
//   const { user } = useSelector((state) => state.auth);

//   const facility = user ? user.facility : '...';
  
//   return(
//       <span>{ShortenText(facility, 9)} &nbsp; </span>
//   )
// }
