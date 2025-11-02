import React from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader } from 'reactstrap';

const Cudzich = () => {
    return (
        <Container fluid className="mt-4">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <h4 className="mb-0">Cudzich</h4>
                        </CardHeader>
                        <CardBody>
                            <p>To jest nowa zakładka Cudzich. Tutaj będzie można dodać funkcjonalności.</p>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Cudzich;