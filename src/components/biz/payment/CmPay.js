import React, { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Typography } from '@mui/material';
import getStripe from '@/utils/stripe';
import { LoadingButton } from '@mui/lab';

export const CmPay = ({ gStripe, submit }) => {
  const [clientSecret, setClientSecret] = useState('');
  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#28aeb1',
    },
  };
  useEffect(() => {
    gStripe.getClientSecret((res) => {
      res.success && setClientSecret(res.data);
    });
  }, []);

  const options = {
    clientSecret: clientSecret,
    appearance,
  };

  return (
    <>
      {clientSecret && (
        <div
          style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Elements options={options} stripe={getStripe()}>
            <CheckoutForm gStripe={gStripe} submit={submit} />
          </Elements>
        </div>
      )}
    </>
  );
};

const CheckoutForm = ({ gStripe, submit }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      // Stripe.js has not yet loaded or Elements instance has not been created
      setIsPending(false);
      return;
    }
    setIsPending(true);
    const result = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });
    if (result.error) {
      // Handle error here
      console.log('发生错误', result.error);
      setIsPending(false);
      setErrorMsg(result.error.message || '');
    } else {
      console.log('支付结果', result);
      if (result.setupIntent && result.setupIntent.status === 'succeeded') {
        gStripe.changeDefaultPay(result.setupIntent.payment_method, (_res) => {
          setIsPending(false);
          submit && submit();
        });
      }
    }
  };

  return (
    <>
      <Typography sx={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>お支払い方法の追加</Typography>
      <PaymentElement
        onFocus={() => {
          setErrorMsg('');
        }}
      />
      <LoadingButton
        loading={isPending}
        disableElevation
        size="large"
        fullWidth
        variant="contained"
        sx={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginTop: '10px',
          backgroundColor: '#28aeb1',
          '&:hover': {
            backgroundColor: '#28aeb1',
            opacity: '0.8',
          },
        }}
        disabled={!stripe}
        onClick={handleSubmit}
      >
        クレジットカードを追加
      </LoadingButton>
      <Typography
        color="error"
        sx={{
          display: errorMsg ? 'block' : 'none',
          textAlign: 'center',
          fontSize: '15px',
          margin: '10px',
        }}
      >
        {errorMsg}
      </Typography>
    </>
  );
};
