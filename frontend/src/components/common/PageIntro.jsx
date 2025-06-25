import React from 'react'

const PageIntro = ({heading, subHeading}) => {
  return (
            <div>
            <h1 className="text-2xl font-bold text-white">{heading}</h1>
            <p className="text-gray-400">{subHeading}</p>
          </div>
  )
}

export default PageIntro