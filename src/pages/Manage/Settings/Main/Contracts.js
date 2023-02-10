import { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';

import { useApplicationContext } from '../../../../context/applicationContext';
import { STORAGE_NETWORK_ID, STORAGE_NETWORK_NAME } from '../../../../constants';
import { SUPPORTED_NETWORKS, SUPPORTED_CHAIN_IDS } from '../../../../connectors';
import { isAddress, switchInjectedNetwork } from '../../../../utils/utils';
import { deployLaunchpadContracts } from '../../../../utils/contract';
import { saveAppData } from '../../../../utils/storage';

import styled from 'styled-components';
import { FaAngleDown } from "react-icons/fa";
import {
  TextField,
  InputLabel,
  Select,
  MenuItem,
  Accordion as AccordionMUI,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import * as s from "../../../../styles/global";
import Loader from '../../../../components/Loader';

const ContentWrapper = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;

  ${({ disabled }) => (disabled ? `
    cursor: not-allowed;
    pointer-events: none;
    opacity: 0.6;
    ` : ''
  )};
`;

const Accordion = styled(AccordionMUI)`

`;

export default function Contracts() {
  const { library, chainId, account, connector } = useWeb3React();
  const {
    domain,
    domainSettings: {
      contracts
    },
    triggerDomainData,
  } = useApplicationContext();

  const [isLoading, setIsLoading] = useState(false);

  const [chainIdToSetUp, setChainIdToSetUp] = useState((chainId && !!contracts?.[chainId || 0]) ? chainId : '');
  const [FeeTokenAddress, setFeeTokenAddress] = useState(contracts?.[chainId || 0]?.FeeTokenAddress || '');
  const [IDOFactoryAddress, setIDOFactoryAddress] = useState(contracts?.[chainId || 0]?.IDOFactoryAddress || '');
  const [TokenLockerFactoryAddress, setTokenLockerFactoryAddress] = useState(contracts?.[chainId || 0]?.TokenLockerFactoryAddress || '');
  const [canSaveNetworksSettings, setCanSaveNetworksSettings] = useState(false);

  const [hasDeployedContract, setHasDeployedContract] = useState(Boolean(
    contracts?.[chainId || 0]?.FeeTokenAddress &&
    contracts?.[chainId || 0]?.IDOFactoryAddress &&
    contracts?.[chainId || 0]?.TokenLockerFactoryAddress
  ));

  const [isRedeployAllowed, setIsRedeployAllowed] = useState(false);
  const [isChainIdForDeploying, setIsChainIdForDeploying] = useState(chainId === chainIdToSetUp);
  const [isDeployingContracts, setIsDeployingContracts] = useState(false);
  const [canDeploySwapContracts, setCanDeploySwapContracts] = useState(
    !isDeployingContracts &&
    FeeTokenAddress &&
    isAddress(FeeTokenAddress) &&
    (chainIdToSetUp === chainId) &&
    (!hasDeployedContract || (hasDeployedContract && isRedeployAllowed))
  );

  const isStorageNetwork = chainId === STORAGE_NETWORK_ID;
  const canChangeNetwork = (connector instanceof InjectedConnector);

  useEffect(() => {
    const isDifferentContracts = (
      FeeTokenAddress?.toLowerCase() !== contracts?.[chainIdToSetUp || 0]?.FeeTokenAddress?.toLowerCase() ||
      IDOFactoryAddress?.toLowerCase() !== contracts?.[chainIdToSetUp || 0]?.IDOFactoryAddress?.toLowerCase() ||
      TokenLockerFactoryAddress?.toLowerCase() !== contracts?.[chainIdToSetUp || 0]?.TokenLockerFactoryAddress?.toLowerCase()
    );

    const isSameContractAddresses = (
      FeeTokenAddress?.toLowerCase() === IDOFactoryAddress?.toLowerCase() ||
      FeeTokenAddress?.toLowerCase() === TokenLockerFactoryAddress?.toLowerCase() ||
      IDOFactoryAddress?.toLowerCase() === TokenLockerFactoryAddress?.toLowerCase()
    );

    setCanSaveNetworksSettings(
      isStorageNetwork &&
      SUPPORTED_CHAIN_IDS.includes(chainIdToSetUp) &&
      isAddress(FeeTokenAddress) &&
      isAddress(IDOFactoryAddress) &&
      isAddress(TokenLockerFactoryAddress) &&
      isDifferentContracts &&
      !isSameContractAddresses
    );
  }, [contracts, FeeTokenAddress, IDOFactoryAddress, TokenLockerFactoryAddress, chainIdToSetUp, isStorageNetwork]);

  useEffect(() => {
    setFeeTokenAddress(contracts?.[chainIdToSetUp || 0]?.FeeTokenAddress || '');
    setIDOFactoryAddress(contracts?.[chainIdToSetUp || 0]?.IDOFactoryAddress || '');
    setTokenLockerFactoryAddress(contracts?.[chainIdToSetUp || 0]?.TokenLockerFactoryAddress || '');

    setHasDeployedContract(Boolean(
      contracts?.[chainIdToSetUp || 0]?.FeeTokenAddress &&
      contracts?.[chainIdToSetUp || 0]?.IDOFactoryAddress &&
      contracts?.[chainIdToSetUp || 0]?.TokenLockerFactoryAddress
    ));

    setIsRedeployAllowed(false);

  }, [contracts, chainIdToSetUp]);


  useEffect(() => {
    setCanDeploySwapContracts(
      !isDeployingContracts &&
      FeeTokenAddress &&
      isAddress(FeeTokenAddress) &&
      (!hasDeployedContract || (hasDeployedContract && isRedeployAllowed))
    )
  }, [isDeployingContracts, FeeTokenAddress, hasDeployedContract, isRedeployAllowed]);

  useEffect(() => {
    setIsChainIdForDeploying(chainId === chainIdToSetUp);
  }, [chainId, chainIdToSetUp]);


  const saveContractsData = async () => {
    setIsLoading(true);
    try {
      await saveAppData({
        library,
        domain,
        owner: account || '',
        data: {
          contracts: {
            [chainIdToSetUp]: {
              FeeTokenAddress,
              IDOFactoryAddress,
              TokenLockerFactoryAddress
            },
          },
        },
        onReceipt: () => {
            triggerDomainData();
          },
        onHash: (hash) => {
          console.log('saveContractsData hash: ', hash);
        },
      })
    } catch (error) {
      console.group('%c saveContractsData', 'color: red');
      console.error(error);
      console.groupEnd();
    } finally {
      setIsLoading(false);
    }
  }

  const switchToInjectedNetwork = async (chainId) => {
    setIsLoading(true);

    try {
      await switchInjectedNetwork(chainId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const onContractsDeployment = async () => {
    if (!chainId) return

    setIsDeployingContracts(true)

    try {
      await deployLaunchpadContracts({
        chainId: chainIdToSetUp,
        library,
        FeeTokenAddress,
        onIDOFactoryHash: (hash) => {
          console.log('onIDOFactoryHash: ', hash)
        },
        onLockerFactoryHash: (hash) => {
          console.log('onLockerFactoryHash: ', hash)
        },
        onSuccessfulDeploy: async ({ chainId, FeeTokenAddress, IDOFactoryAddress, TokenLockerFactoryAddress }) => {
          console.log('deployLaunchpadContracts onSuccessfulDeploy', {
            chainId,
            FeeTokenAddress,
            IDOFactoryAddress,
            TokenLockerFactoryAddress
          });
          setFeeTokenAddress(FeeTokenAddress);
          setIDOFactoryAddress(IDOFactoryAddress);
          setTokenLockerFactoryAddress(TokenLockerFactoryAddress);

          triggerDomainData();

          // TODO: save addresses to the local storage and offer set these after switch at setting up network
        },
      })
    } catch (error) {
      console.group('%c onContractsDeployment', 'color: red');
      console.error(error);
      console.groupEnd();
    } finally {
      setIsDeployingContracts(false);
    }
  }

  return (
    <ContentWrapper disabled={isLoading || isDeployingContracts}>
      <Typography variant="h6">Contracts</Typography>

      <s.SpacerSmall />

      <InputLabel id="selectedNetworkLablel">Selected Network</InputLabel>
      <Select
        labelId="selectedNetworkLable"
        id="selectedNetwork"
        value={chainIdToSetUp}
        label="Network"
        onChange={(e) => {
          setChainIdToSetUp(e.target.value);
        }}
      >
        {SUPPORTED_CHAIN_IDS.map((chainId) => (
          <MenuItem key={chainId} value={chainId}>{SUPPORTED_NETWORKS[chainId].name}</MenuItem>
        ))}
      </Select>

      <s.SpacerSmall />

      { chainIdToSetUp ? (
        <Accordion>
          <AccordionSummary
            expandIcon={<FaAngleDown />}
            aria-controls="deployment-content"
            id="deployment-header"
          >
            <Typography>Deployment</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {hasDeployedContract &&
              <>
                <s.Text small warning>
                  {
                    `You have already deployed swap contracts.
                    This means that if you deploy the contracts again, the previous contract addresses will be replaced by the new ones.
                    The new contracts will not have any previously set IDOPools, Token Lockers or fee configurations`
                  }
                </s.Text>

                <FormControlLabel
                  control={<Checkbox
                    checked={isRedeployAllowed}
                    onChange={() => {
                      setIsRedeployAllowed((prevState) => !prevState);
                    }}
                  />}
                  label="Allow re-deploy"
                />
              </>
            }
            {chainIdToSetUp !== STORAGE_NETWORK_ID &&
              <s.Text small warning>
                {
                  `If you deploy contracts from a network other than the ${STORAGE_NETWORK_NAME} Storage network, you need to save them manually.
                  Switch to Storage Network, fill in the fields below and save it.
                  You can also use existing contracts, but only if they are related to the IDOFactory app`
                }
              </s.Text>
            }
            {!hasDeployedContract && !FeeTokenAddress ? (
              <s.Text small warning>
                The Fee Token Address field is empty.
              </s.Text>
            ) : !isAddress(FeeTokenAddress) && (
              <s.Text small error>
                The Fee Token Address is not correct.
              </s.Text>
            )}

            <s.Text small>
              You are going to deploy contracts of the IDOFactory application. You have to confirm these transactions:
              <br />
              1. Deploy IDOFactory contract
              <br />
              2. Deploy TokenLockerFactory contract
            </s.Text>

            {
              isChainIdForDeploying ? (
                <s.button
                  fullWidth
                  onClick={onContractsDeployment}
                  disabled={!canDeploySwapContracts}
                >
                  { isDeployingContracts ? <Loader /> : 'Deploy contracts' }
                </s.button>
              ) : (
                <s.button
                  fullWidth
                  onClick={() => switchToInjectedNetwork(chainIdToSetUp)}
                  disabled={!canChangeNetwork}
                >
                  { isLoading ? <Loader /> : `Switch to ${SUPPORTED_NETWORKS[chainIdToSetUp].name}` }
                </s.button>
              )
            }
          </AccordionDetails>
        </Accordion>
      ) : (
        <s.Text small warning>
          Please, select the Network
        </s.Text>
      )}

      <s.SpacerSmall />

      <TextField
        label="Fee Token Address"
        value={FeeTokenAddress}
        onChange={(e) => {
          setFeeTokenAddress(e.target.value);
        }}
        error={Boolean(FeeTokenAddress && !isAddress(FeeTokenAddress))}
      />

      <s.SpacerSmall />

      <TextField
        label="IDO Factory Address"
        value={IDOFactoryAddress}
        onChange={(e) => {
          setIDOFactoryAddress(e.target.value);
        }}
        error={Boolean(IDOFactoryAddress && !isAddress(IDOFactoryAddress))}
      />

      <s.SpacerSmall />

      <TextField
        label="Token Locker Factory Address"
        value={TokenLockerFactoryAddress}
        onChange={(e) => {
          setTokenLockerFactoryAddress(e.target.value);
        }}
        error={Boolean(TokenLockerFactoryAddress && !isAddress(TokenLockerFactoryAddress))}
      />

      <s.SpacerSmall />

      {
        isStorageNetwork ? (
          <s.button
            onClick={saveContractsData}
            disabled={!canSaveNetworksSettings}
          >
            { isLoading ? <Loader /> : 'Save Contracts Settings' }
          </s.button>
        ) : (
          <s.button
            onClick={() => switchToInjectedNetwork(STORAGE_NETWORK_ID)}
            disabled={!canChangeNetwork}
          >
            { isLoading ? <Loader /> : `Switch to ${STORAGE_NETWORK_NAME}` }
          </s.button>
        )

      }

    </ContentWrapper>
  )
}