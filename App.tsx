import React, { useState } from 'react'
import OfferGenerator from './components/OfferGenerator'
import LoginScreen from './components/LoginScreen'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)

  if (!authenticated) {
    return (
      <LoginScreen
        onSuccess={() => setAuthenticated(true)}
        appName="Starter Home – Generator Ofert"
        logoUrl="https://i.ibb.co/0pXg4mq/starterhome-logo.png"
      />
    )
  }

  return <OfferGenerator />
}
